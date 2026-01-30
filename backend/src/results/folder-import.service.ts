import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { StorageService } from '../storage/storage.service';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { PdfExtractorUtil } from './pdf-extractor.util';

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

interface ParsedPatientInfo {
    lastName: string;
    firstName: string;
    patientCode: string;
    originalFileName: string;
}

@Injectable()
export class FolderImportService {
    private readonly logger = new Logger(FolderImportService.name);
    private processedFiles = new Set<string>(); // Track processed files to avoid duplicates

    constructor(
        private readonly prisma: PrismaService,
        private readonly storage: StorageService,
    ) { }

    /**
     * Cron job that runs every 2 minutes to check for new files
     */
    @Cron('*/10 * * * * *') // Every 10 seconds
    async scanAndImportFiles() {
        this.logger.log('🔍 [CRON] Starting folder scan...');

        try {
            // Get all active tenants with configured import folder paths
            const tenants = await this.prisma.tenant.findMany({
                where: {
                    isActive: true,
                    // @ts-ignore
                    importFolderPath: {
                        not: null,
                    },
                },
            });

            for (const tenant of tenants) {
                // @ts-ignore
                if (!tenant.importFolderPath) continue;

                // @ts-ignore
                this.logger.log(`📂 Scanning folder for tenant ${tenant.name}: ${tenant.importFolderPath}`);
                // @ts-ignore
                await this.scanFolderForTenant(tenant.id, tenant.importFolderPath);
            }
        } catch (error) {
            this.logger.error('❌ Error during folder scan:', error);
        }
    }

    /**
     * Scan a specific folder for a tenant
     */
    private async scanFolderForTenant(tenantId: string, folderPath: string) {
        try {
            // Check if folder exists
            if (!fs.existsSync(folderPath)) {
                this.logger.warn(`⚠️  Folder does not exist: ${folderPath}`);
                return;
            }

            // Read all files in the folder
            const files = await readdir(folderPath);
            const pdfFiles = files.filter(file => file.toLowerCase().endsWith('.pdf'));

            this.logger.log(`📄 Found ${pdfFiles.length} PDF files in ${folderPath}`);

            for (const fileName of pdfFiles) {
                const filePath = path.join(folderPath, fileName);
                const fileKey = `${tenantId}-${fileName}-${Date.now()}`;

                // Skip if already processed
                if (this.processedFiles.has(fileKey)) {
                    continue;
                }

                try {
                    this.logger.log(`📄 Processing file: ${fileName}`);
                    const fileBuffer = await readFile(filePath);
                    const fileStats = await stat(filePath);

                    // Parse patient info from content FIRST
                    const extracted = await PdfExtractorUtil.extractData(fileBuffer);

                    const patientInfo = {
                        lastName: extracted.lastName || '',
                        firstName: extracted.firstName || '',
                        patientCode: extracted.folderRef || '',
                    };

                    // Fallback to filename if essential info is missing
                    if (!patientInfo.lastName || !patientInfo.patientCode) {
                        this.logger.log(`ℹ️ Content extraction incomplete for ${fileName}, trying filename parsing...`);
                        const fromName = this.parseFileName(fileName);
                        if (fromName) {
                            patientInfo.lastName = patientInfo.lastName || fromName.lastName;
                            patientInfo.firstName = patientInfo.firstName || fromName.firstName;
                            patientInfo.patientCode = patientInfo.patientCode || fromName.patientCode;
                        }
                    }

                    if (!patientInfo.lastName || !patientInfo.patientCode) {
                        this.logger.warn(`⚠️  Could not extract info (Name/Code) from content or filename for: ${fileName}`);
                        this.processedFiles.add(fileKey); // Don't keep retrying failed files in this session
                        continue;
                    }

                    this.logger.log(`👤 Identified patient: ${patientInfo.firstName} ${patientInfo.lastName} (Ref: ${patientInfo.patientCode})`);

                    // Check if file was already imported based on folderRef
                    const existing = await this.prisma.document.findFirst({
                        where: {
                            tenantId,
                            folderRef: patientInfo.patientCode,
                        },
                    });

                    if (existing) {
                        this.logger.log(`⏭️  Reference ${patientInfo.patientCode} already exists in database. Skipping ${fileName}`);
                        this.processedFiles.add(fileKey);
                        continue;
                    }

                    // Upload to S3
                    const s3Key = `imports/${tenantId}/${Date.now()}-${fileName}`;
                    await this.storage.uploadFile(fileBuffer, s3Key, 'application/pdf');

                    // Create document record with IMPORTED status
                    const document = await this.prisma.document.create({
                        data: {
                            tenantId,
                            folderRef: patientInfo.patientCode,
                            fileKey: s3Key,
                            mimeType: 'application/pdf',
                            fileSize: fileStats.size,
                            patientFirstName: patientInfo.firstName,
                            patientLastName: patientInfo.lastName,
                            patientEmail: '',
                            patientPhone: extracted.patientPhone || '',
                            patientDob: extracted.dob || null,
                            // @ts-ignore
                            status: 'IMPORTED',
                            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                        },
                    });

                    this.processedFiles.add(fileKey);
                    this.logger.log(`✅ Successfully imported: ${fileName} as Doc ID ${document.id}`);
                } catch (error) {
                    this.logger.error(`❌ Error importing file ${fileName}:`, error);
                }
            }
        } catch (error) {
            this.logger.error(`❌ Error scanning folder ${folderPath}:`, error);
        }
    }

    /**
     * Parse patient information from filename
     * Expected format: "NOM_Prenom_CodePatient.pdf" or "NOM Prenom CodePatient.pdf"
     * Examples: 
     * - "DUPONT_Jean_P12345.pdf"
     * - "MARTIN Marie M67890.pdf"
     */
    private parseFileName(fileName: string): ParsedPatientInfo | null {
        try {
            // Remove .pdf extension
            const nameWithoutExt = fileName.replace(/\.pdf$/i, '');

            // Try different separators: underscore, space, dash
            const separators = ['_', ' ', '-'];

            for (const sep of separators) {
                const parts = nameWithoutExt.split(sep).filter(p => p.trim());

                if (parts.length >= 3) {
                    return {
                        lastName: parts[0].trim(),
                        firstName: parts[1].trim(),
                        patientCode: parts[2].trim(),
                        originalFileName: fileName,
                    };
                }
            }

            // If no separator found, try to extract from continuous string
            // This is a fallback and might not work well
            return null;
        } catch (error) {
            this.logger.error(`Error parsing filename ${fileName}:`, error);
            return null;
        }
    }

    /**
     * Manual trigger for testing (can be called via API endpoint)
     */
    async manualScan(tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
        });

        // @ts-ignore
        if (!tenant || !tenant.importFolderPath) {
            throw new Error('Tenant not found or import folder not configured');
        }

        // @ts-ignore
        await this.scanFolderForTenant(tenantId, tenant.importFolderPath);
        return { message: 'Scan completed' };
    }
}
