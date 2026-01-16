
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { DocumentStatus, AuditAction } from '@prisma/client';

@Injectable()
export class CleanupService {
    private readonly logger = new Logger(CleanupService.name);

    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
    ) { }

    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleCron() {
        this.logger.log('Starting Daily Data Retention Cleanup...');

        try {
            // 1. Get all tenants to respect their individual retention policies
            const tenants = await this.prisma.tenant.findMany();

            let totalDeleted = 0;

            for (const tenant of tenants) {
                // Calculate cutoff date for this tenant
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - tenant.retentionDays);

                // 2. Find expired documents
                const expiredDocs = await this.prisma.document.findMany({
                    where: {
                        tenantId: tenant.id,
                        status: { not: DocumentStatus.EXPIRED }, // Only process active docs
                        createdAt: { lt: cutoffDate },
                    },
                    select: { id: true, fileKey: true },
                });

                if (expiredDocs.length === 0) continue;

                this.logger.log(`Found ${expiredDocs.length} expired documents for Tenant ${tenant.name}`);

                // 3. Process Deletion
                for (const doc of expiredDocs) {
                    // A. Delete from S3
                    await this.storage.deleteFile(doc.fileKey);

                    // B. Update DB to EXPIRED and wipe fileKey for minimization
                    await this.prisma.document.update({
                        where: { id: doc.id },
                        data: {
                            status: DocumentStatus.EXPIRED,
                            fileKey: 'DELETED_RETENTION_POLICY',
                            mimeType: 'application/pdf-deleted',
                            fileSize: 0
                        }
                    });
                }

                totalDeleted += expiredDocs.length;

                // 4. Log Audit for Tenant
                await this.prisma.auditLog.create({
                    data: {
                        tenantId: tenant.id,
                        action: AuditAction.DELETE_DOCUMENT,
                        description: `Auto-deleted ${expiredDocs.length} expired documents (Retention: ${tenant.retentionDays} days)`,
                        actorId: 'SYSTEM_CRON',
                    }
                });
            }

            this.logger.log(`Cleanup Complete. Total documents deleted: ${totalDeleted}`);

        } catch (error) {
            this.logger.error('Cleanup Job Failed', error);
        }
    }
}
