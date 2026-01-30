import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    Header,
    UnauthorizedException,
    BadRequestException,
    NotFoundException,
    ForbiddenException,
    HttpCode,
    HttpStatus,
    HttpException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { SmsService } from '../notifications/sms.service';
import { StorageService } from '../storage/storage.service';
import * as bcrypt from 'bcrypt';
import { DocumentStatus } from '@prisma/client';
import { randomInt } from 'crypto';


@Controller('auth/guest')
export class PatientAuthController {
    constructor(
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
        private readonly smsService: SmsService,
        private readonly storageService: StorageService,
    ) { }

    @Post('challenge')
    @HttpCode(HttpStatus.OK)
    async challenge(@Body('token') token: string) {
        if (!token) throw new BadRequestException('Token is required');

        let payload: any;
        try {
            payload = this.jwtService.verify(token, {
                secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123',
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        if (payload.type !== 'guest_access') {
            throw new UnauthorizedException('Invalid token type');
        }

        const documentId = payload.sub;
        const document = await this.prisma.document.findUnique({
            where: { id: documentId },
        });

        if (!document) {
            throw new NotFoundException('Document not found');
        }

        if (document.status === 'EXPIRED') {
            throw new HttpException('Document has expired due to data retention policy', HttpStatus.GONE);
        }

        // Generate 6-digit OTP
        const code = randomInt(100000, 999999).toString();
        const hashedCode = await bcrypt.hash(code, 10);
        const tokenSignature = token.split('.')[2]; // Use signature part as ID

        // Store in DB (Prisma OtpStore)
        await this.prisma.otpStore.deleteMany({
            where: { tokenSignature },
        });

        await this.prisma.otpStore.create({
            data: {
                tokenSignature,
                codeHash: hashedCode,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
                attempts: 0,
            },
        });

        await this.smsService.sendOtp(document.patientPhone, code);

        // Mask phone number (e.g. +237 *** 789)
        const phone = document.patientPhone;
        const masked = phone ? `${phone.substring(0, 4)} *** ${phone.substring(phone.length - 3)}` : '***';

        return { message: `OTP envoyé au ${masked}` };
    }

    @Post('verify')
    @HttpCode(HttpStatus.OK)
    async verify(@Body() body: { token: string; code: string }) {
        const { token, code } = body;
        if (!token || !code) throw new BadRequestException('Token and code are required');

        // 1. Verify JWT
        try {
            this.jwtService.verify(token, {
                secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123',
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        const tokenSignature = token.split('.')[2];

        // 2. Fetch OTP Record
        const otpRecord = await this.prisma.otpStore.findFirst({
            where: { tokenSignature }
        });

        if (!otpRecord) {
            throw new BadRequestException('No OTP request found for this token');
        }

        if (new Date() > otpRecord.expiresAt) {
            throw new BadRequestException('OTP has expired. Request a new one.');
        }

        if (otpRecord.attempts >= 3) {
            throw new ForbiddenException('Too many failed attempts. Request a new OTP.');
        }

        // 3. Verify Code
        const isMatch = await bcrypt.compare(code, otpRecord.codeHash);
        if (!isMatch) {
            await this.prisma.otpStore.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } }
            });
            throw new ForbiddenException('Code OTP invalide');
        }

        // 4. Success - Audit & Generate Link
        const payload = this.jwtService.decode(token) as any;
        const documentId = payload.sub;

        const document = await this.prisma.document.findUnique({ where: { id: documentId } });
        if (!document) throw new NotFoundException('Document not found');

        if (document.status === 'EXPIRED') {
            throw new HttpException('Document expiré', HttpStatus.GONE);
        }

        await this.prisma.auditLog.create({
            data: {
                action: 'VIEW_DOCUMENT',
                tenantId: document.tenantId,
                resourceId: document.id,
                actorId: 'PATIENT',
                description: 'Patient accessed document via 2FA (link + SMS)',
            }
        });

        if (document.status !== ('CONSULTED' as any)) {
            await this.prisma.document.update({
                where: { id: documentId },
                data: { status: 'CONSULTED' as any }
            });
        }

        // Cleanup OTP
        await this.prisma.otpStore.delete({ where: { id: otpRecord.id } });

        // Generate a short-lived File Access Token (5 mins)
        const fileToken = this.jwtService.sign(
            { sub: document.id, key: document.fileKey, type: 'file_access' },
            { secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123', expiresIn: '5m' }
        );

        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
        const downloadUrl = `${baseUrl.replace('5173', '3000')}/api/auth/guest/view-file?token=${fileToken}`;

        return { downloadUrl, status: 'success' };
    }

    @Post('verify-fallback')
    @HttpCode(HttpStatus.OK)
    async verifyFallback(@Body() body: { token: string; dob: string }) {
        const { token, dob } = body;
        if (!token || !dob) throw new BadRequestException('Token and Date of Birth are required');

        try {
            this.jwtService.verify(token, {
                secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123',
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired token');
        }

        const tokenSignature = token.split('.')[2];
        const otpRecord = await this.prisma.otpStore.findFirst({
            where: { tokenSignature }
        });

        if (!otpRecord) {
            throw new BadRequestException('Session invalide ou expirée. Veuillez recommencer.');
        }

        if (new Date() > otpRecord.expiresAt) {
            throw new BadRequestException('Session expirée.');
        }

        const payload = this.jwtService.decode(token) as any;
        const documentId = payload.sub;

        const document = await this.prisma.document.findUnique({ where: { id: documentId } });
        if (!document) throw new NotFoundException('Document introuvable');

        if (document.status === 'EXPIRED') {
            throw new HttpException('Document expiré', HttpStatus.GONE);
        }

        if (!document.patientDob) {
            throw new BadRequestException('Authentification de secours indisponible pour ce document.');
        }

        const inputDate = new Date(dob);
        const docDate = new Date(document.patientDob);

        const isMatch =
            inputDate.getFullYear() === docDate.getFullYear() &&
            inputDate.getMonth() === docDate.getMonth() &&
            inputDate.getDate() === docDate.getDate();

        if (!isMatch) {
            await this.prisma.otpStore.update({
                where: { id: otpRecord.id },
                data: { attempts: { increment: 1 } }
            });
            throw new ForbiddenException('Date de naissance incorrecte');
        }

        await this.prisma.auditLog.create({
            data: {
                action: 'VIEW_DOCUMENT',
                tenantId: document.tenantId,
                resourceId: document.id,
                actorId: 'PATIENT',
                description: 'Patient accessed document via DOB Fallback',
            }
        });

        if (document.status !== ('CONSULTED' as any)) {
            await this.prisma.document.update({
                where: { id: documentId },
                data: { status: 'CONSULTED' as any }
            });
        }

        await this.prisma.otpStore.delete({ where: { id: otpRecord.id } });

        // Generate File Access Token
        const fileToken = this.jwtService.sign(
            { sub: document.id, key: document.fileKey, type: 'file_access' },
            { secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123', expiresIn: '5m' }
        );

        const baseUrl = process.env.APP_BASE_URL || 'http://localhost:5173';
        const downloadUrl = `${baseUrl.replace('5173', '3000')}/api/auth/guest/view-file?token=${fileToken}`;

        return { downloadUrl, status: 'success' };
    }

    @Get('view-file')
    @Header('Content-Type', 'application/pdf')
    @Header('Content-Disposition', 'inline')
    async viewFile(@Query('token') token: string) {
        if (!token) throw new BadRequestException('Token is required');

        try {
            const payload = this.jwtService.verify(token, {
                secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123',
            });

            if (payload.type !== 'file_access') {
                throw new UnauthorizedException('Invalid token type');
            }

            return this.storageService.getFileStream(payload.key);
        } catch (e) {
            throw new UnauthorizedException('Link expired or invalid');
        }
    }
}
