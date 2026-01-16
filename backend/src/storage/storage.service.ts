import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private readonly bucketName = 'private-medical-results';

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async uploadFile(file: Buffer, key: string, mime: string): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`[MOCK UPLOAD] Key: ${key} | Size: ${file.length} | Mime: ${mime}`);
      return `https://mock-s3.local/${this.bucketName}/${key}`;
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file,
          ContentType: mime,
        }),
      );
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (error) {
      this.logger.error(`S3 Upload Error: ${error.message}`);
      throw error;
    }
  }

  async getPresignedUrl(key: string): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
      return `https://mock-s3.local/preview/${key}?token=dev-token`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, command, { expiresIn: 60 });
    } catch (error) {
      this.logger.error(`Presign Error: ${error.message}`);
      throw error;
    }
  }
  async deleteFile(key: string): Promise<void> {
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`[MOCK DELETE] Key: ${key}`);
      return;
    }

    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(`S3 Delete Error: ${error.message}`);
      // We don't throw here to allow cleanup to continue for other files
    }
  }
}
