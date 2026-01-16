
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class CleanupService {
    private readonly logger = new Logger(CleanupService.name);

    constructor(
        private prisma: PrismaService,
        private storage: StorageService,
    ) { }

    /**
     * Smart Data Retention Cron Job
     * Runs daily at 03:00 AM
     * Anonymizes documents instead of deleting them (preserves analytics)
     */
    @Cron(CronExpression.EVERY_DAY_AT_3AM)
    async handleCron() {
        this.logger.log('🕐 Starting Daily Data Retention & Anonymization Job...');

        try {
            // 1. Get all tenants to respect their individual retention policies
            const tenants = await this.prisma.tenant.findMany({
                select: {
                    id: true,
                    name: true,
                    configuredRetentionDays: true,
                }
            });

            let totalAnonymized = 0;

            for (const tenant of tenants) {
                // Calculate cutoff date based on tenant's configured retention
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - tenant.configuredRetentionDays);

                // 2. Find eligible documents for anonymization
                const eligibleDocs = await this.prisma.document.findMany({
                    where: {
                        tenantId: tenant.id,
                        isAnonymized: false, // Only process non-anonymized docs
                        createdAt: { lt: cutoffDate },
                    },
                    select: { id: true, fileKey: true, folderRef: true },
                });

                if (eligibleDocs.length === 0) continue;

                this.logger.log(`📋 Tenant "${tenant.name}": ${eligibleDocs.length} documents éligibles à l'anonymisation (Rétention: ${tenant.configuredRetentionDays} jours)`);

                // 3. Process Anonymization
                for (const doc of eligibleDocs) {
                    try {
                        // A. Delete physical file from S3
                        if (doc.fileKey && !doc.fileKey.startsWith('ANONYMIZED')) {
                            await this.storage.deleteFile(doc.fileKey);
                        }

                        // B. Anonymize DB Record (Atomic Update)
                        await this.prisma.document.update({
                            where: { id: doc.id },
                            data: {
                                // Clear sensitive data
                                fileKey: 'ANONYMIZED_RETENTION_POLICY',
                                patientFirstName: 'Dossier',
                                patientLastName: 'Archivé',
                                patientEmail: 'archived@anonymized.local',
                                patientPhone: '000000000',
                                folderRef: `ARCHIVED-${doc.folderRef}`,
                                // Mark as anonymized
                                isAnonymized: true,
                                // Keep: id, tenantId, status, createdAt (for analytics)
                            }
                        });
                    } catch (docError) {
                        this.logger.error(`Failed to anonymize document ${doc.id}`, docError);
                    }
                }

                totalAnonymized += eligibleDocs.length;

                // 4. Log Audit for Tenant
                await this.prisma.auditLog.create({
                    data: {
                        tenantId: tenant.id,
                        action: AuditAction.DELETE_DOCUMENT,
                        description: `Auto-anonymized ${eligibleDocs.length} documents (Rétention: ${tenant.configuredRetentionDays} jours)`,
                        actorId: 'SYSTEM_CRON',
                    }
                });
            }

            this.logger.log(`✅ Anonymization Complete. Total documents anonymized: ${totalAnonymized}`);

        } catch (error) {
            this.logger.error('❌ Cleanup Job Failed', error);
        }
    }

    /**
     * Manual trigger for testing (can be called via API or CLI)
     */
    async runManually() {
        this.logger.warn('⚠️ Manual cleanup triggered');
        await this.handleCron();
    }
}
