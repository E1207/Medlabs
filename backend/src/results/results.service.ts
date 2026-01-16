import { Injectable, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CreateResultDto } from './dto/create-result.dto';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma.service';
import { SmsService } from '../notifications/sms.service';
import { EmailService } from '../notifications/email.service';
import { MagicLinkService } from '../auth/magic-link.service';
import { v4 as uuidv4 } from 'uuid';
import { AuditAction } from '@prisma/client';

@Injectable()
export class ResultsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
        private readonly smsService: SmsService,
        private readonly emailService: EmailService,
        private readonly magicLinkService: MagicLinkService,
    ) { }

    async create(createResultDto: CreateResultDto, file: Express.Multer.File, tenantId: string, userId: string) {
        if (!file) {
            throw new BadRequestException('File is required');
        }
        if (file.mimetype !== 'application/pdf') {
            throw new BadRequestException('Only PDF files are allowed');
        }

        const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);
        if (!file.buffer || file.buffer.length < 4 || !file.buffer.slice(0, 4).equals(PDF_MAGIC)) {
            throw new BadRequestException('Invalid PDF file: file signature does not match PDF format');
        }

        const existingDoc = await this.prisma.document.findFirst({
            where: {
                tenantId: tenantId,
                folderRef: createResultDto.folderRef,
            },
        });

        if (existingDoc) {
            throw new ConflictException(`Folder Reference ${createResultDto.folderRef} already exists for this tenant.`);
        }

        const fileUuid = uuidv4();
        const year = new Date().getFullYear();
        const key = `tenants/${tenantId}/${year}/${fileUuid}.pdf`;

        await this.storage.uploadFile(file.buffer, key, file.mimetype);

        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);

        const nameParts = (createResultDto.patientName || '').trim().split(' ');
        const lastName = nameParts.pop() || 'Unknown';
        const firstName = nameParts.join(' ') || 'Unknown';

        const document = await this.prisma.document.create({
            data: {
                tenantId: tenantId,
                folderRef: createResultDto.folderRef,
                fileKey: key,
                fileSize: file.size,
                mimeType: file.mimetype,
                patientPhone: createResultDto.patientPhone,
                patientEmail: createResultDto.patientEmail,
                patientFirstName: firstName,
                patientLastName: lastName,
                patientDob: new Date(createResultDto.patientDob),
                uploadedById: userId,
                expiresAt: expiresAt,
                status: 'UPLOADED',
            },
        });

        // Trigger Notification
        this.notifyPatient(document.id).catch(err => console.error('Failed to notify patient', err));

        return {
            message: 'Result uploaded and processed',
            documentId: document.id,
        };
    }

    async findAll(tenantId: string, search: string = '', page: number = 1) {
        const take = 10;
        const skip = (page - 1) * take;

        const where: any = {};
        if (tenantId) {
            where.tenantId = tenantId;
        }

        if (search) {
            where.OR = [
                { patientFirstName: { contains: search, mode: 'insensitive' } },
                { patientLastName: { contains: search, mode: 'insensitive' } },
                { folderRef: { contains: search, mode: 'insensitive' } },
                { patientPhone: { contains: search } },
            ];
        }

        const [results, total] = await Promise.all([
            this.prisma.document.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    createdAt: true,
                    patientFirstName: true,
                    patientLastName: true,
                    patientPhone: true,
                    folderRef: true,
                    status: true,
                }
            }),
            this.prisma.document.count({ where }),
        ]);

        const mappedResults = results.map(r => ({
            ...r,
            patientName: `${r.patientFirstName} ${r.patientLastName}`.trim(),
        }));

        return {
            data: mappedResults,
            meta: { total, page, lastPage: Math.ceil(total / take) }
        };
    }

    async getPreviewUrl(tenantId: string, resultId: string) {
        const doc = await this.prisma.document.findFirst({
            where: { id: resultId, tenantId },
        });

        if (!doc) throw new NotFoundException('Document not found');

        if (doc.status === 'EXPIRED') {
            throw new ConflictException('Document has been permanently deleted due to retention policy.');
        }

        const url = await this.storage.getPresignedUrl(doc.fileKey);
        return { url };
    }

    async resendResult(tenantId: string, resultId: string, newPhone: string, userId: string) {
        const doc = await this.prisma.document.findFirst({
            where: { id: resultId, tenantId },
        });

        if (!doc) throw new NotFoundException('Document not found');

        if (doc.status === 'EXPIRED') {
            throw new ConflictException('Cannot resend result: Document has been deleted due to retention policy.');
        }

        if (newPhone && newPhone !== doc.patientPhone) {
            await this.prisma.document.update({
                where: { id: resultId },
                data: { patientPhone: newPhone },
            });
        }

        // Re-trigger notification
        await this.notifyPatient(resultId);

        // Audit Log
        await this.prisma.auditLog.create({
            data: {
                tenantId,
                action: AuditAction.UPDATE_SETTINGS,
                description: `Resent notification to ${newPhone} for Document ${doc.folderRef}`,
                resourceId: resultId,
                actorId: userId,
            },
        });

        return { message: 'Notification resent successfully' };
    }

    private async notifyPatient(documentId: string) {
        const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
        if (!doc) return;

        const magicLink = await this.magicLinkService.generateLink(documentId);
        const patientName = `${doc.patientFirstName} ${doc.patientLastName}`.trim();
        const dateStr = doc.createdAt.toLocaleDateString('fr-FR');

        // 1. Send SMS
        await this.smsService.sendResultNotification(
            doc.patientPhone,
            patientName,
            doc.folderRef,
            magicLink
        );

        // 2. Send Email (if available)
        if (doc.patientEmail) {
            await this.emailService.sendResultNotification({
                to: doc.patientEmail,
                patientName,
                folderRef: doc.folderRef,
                date: dateStr,
                magicLink,
                tenantId: doc.tenantId,
            });
        }

        // Update Status
        await this.prisma.document.update({
            where: { id: documentId },
            data: { status: 'NOTIFIED' }
        });
    }

    async remove(tenantId: string, id: string) {
        // If tenantId is null (Super Admin), we skip the check
        const where: any = { id };
        if (tenantId) {
            where.tenantId = tenantId;
        }

        const doc = await this.prisma.document.findFirst({ where });

        if (!doc) throw new NotFoundException('Document not found');

        await this.prisma.document.delete({
            where: { id }
        });

        // TODO: Delete file from S3
        return { message: 'Document deleted successfully' };
    }
}
