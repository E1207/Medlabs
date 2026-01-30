import { Injectable, Logger, NotFoundException, StreamableFile } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client | null = null;
  private readonly bucketName = process.env.AWS_S3_BUCKET || 'private-medical-results';

  // Encryption for local storage
  private readonly algorithm = 'aes-256-cbc';
  private readonly encryptionKey = process.env.STORAGE_ENCRYPTION_KEY || 'a-very-secret-key-32-chars-long-!!!'; // Should be 32 chars
  private readonly ivLength = 16;

  // Coffre-fort local pour le développement sans Docker
  private readonly devStoragePath = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), 'medical_vault');

  constructor() {
    // Ensure key length is 32 for aes-256-cbc
    if (this.encryptionKey.length < 32) {
      this.logger.warn('STORAGE_ENCRYPTION_KEY is too short. Using fallback hashing (NOT RECOMMENDED FOR PROD).');
    }

    // Si on a les variables AWS, on utilise S3. Sinon mode Local Vault.
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_REGION) {
      const s3Config: any = {
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      };
      if (process.env.AWS_S3_ENDPOINT) {
        s3Config.endpoint = process.env.AWS_S3_ENDPOINT;
        s3Config.forcePathStyle = true;
      }
      this.s3Client = new S3Client(s3Config);
      this.logger.log('☁️  Storage branché sur S3 (Production/Cloud Mode)');
    } else {
      this.logger.log(`📁 Storage branché sur le Coffre-fort Local : ${this.devStoragePath}`);
      if (!fs.existsSync(this.devStoragePath)) {
        fs.mkdirSync(this.devStoragePath, { recursive: true });
      }
    }
  }

  private getFinalKey(): Buffer {
    return crypto.createHash('sha256').update(this.encryptionKey).digest();
  }

  private encrypt(buffer: Buffer): Buffer {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, this.getFinalKey(), iv);
    const encrypted = Buffer.concat([iv, cipher.update(buffer), cipher.final()]);
    return encrypted;
  }

  private decrypt(buffer: Buffer): Buffer {
    const iv = buffer.slice(0, this.ivLength);
    const encryptedText = buffer.slice(this.ivLength);
    const decipher = crypto.createDecipheriv(this.algorithm, this.getFinalKey(), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted;
  }

  async uploadFile(file: Buffer, key: string, mime: string): Promise<string> {
    if (!this.s3Client) {
      const safeKey = key.replace(/\//g, '_');
      const filePath = path.join(this.devStoragePath, safeKey);

      // Encrypt before saving localy
      const encryptedData = this.encrypt(file);
      fs.writeFileSync(filePath, encryptedData);

      this.logger.debug(`File saved and encrypted locally: ${safeKey}`);
      return safeKey;
    }

    try {
      await this.s3Client.send(new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file,
        ContentType: mime,
        ServerSideEncryption: 'AES256', // Encryption at rest in S3
      }));
      return key;
    } catch (error) {
      this.logger.error(`Storage Upload Error: ${error.message}`);
      throw error;
    }
  }

  async getPresignedUrl(key: string): Promise<string> {
    // We return a relative path that the frontend can use with its API client.
    // We use a query parameter 'key' instead of a route parameter to avoid 
    // issues with encoded slashes (%2F) which are often rejected or decoded 
    // incorrectly by web servers.
    return `/results/view-secure?key=${encodeURIComponent(key)}`;
  }

  /**
   * Returns a readable stream for the file, handling decryption if local
   * or downloading from S3 if configured.
   */
  async getFileStream(key: string): Promise<StreamableFile> {
    if (!this.s3Client) {
      return this.getLocalFileStream(key);
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      const stream = response.Body as Readable;

      return new StreamableFile(stream);
    } catch (error) {
      this.logger.error(`S3 Stream Error for ${key}: ${error.message}`);
      throw new NotFoundException('Fichier introuvable sur S3');
    }
  }

  private async getLocalFileStream(key: string) {
    const safeKey = key.includes('/') ? key.replace(/\//g, '_') : key;
    const filePath = path.join(this.devStoragePath, safeKey);

    // 1. Try Main Vault (Encrypted)
    if (fs.existsSync(filePath)) {
      const encryptedData = fs.readFileSync(filePath);
      try {
        const decryptedData = this.decrypt(encryptedData);
        const stream = new Readable();
        stream.push(decryptedData);
        stream.push(null);
        return new StreamableFile(stream);
      } catch (e) {
        this.logger.error(`Decryption failed for ${key}: ${e.message}`);
        throw new Error('Impossible de décrypter le document médical.');
      }
    }

    // 2. Dev Fallback: Check raw file in incomings if it's an import key
    if (process.env.LOCAL_IMPORT_PATH && key.startsWith('imports/')) {
      const parts = key.split('/');
      const fullBaseName = parts[parts.length - 1]; // e.g., "1769621320015-PATIENT_260105007.pdf"

      const dashIndex = fullBaseName.indexOf('-');
      const fileName = dashIndex !== -1 ? fullBaseName.substring(dashIndex + 1) : fullBaseName;

      const incomingPath = path.join(process.env.LOCAL_IMPORT_PATH, fileName);

      if (fs.existsSync(incomingPath)) {
        this.logger.log(`🔍 Dev mode: Serving raw file from incomings fallback: ${fileName}`);
        const rawData = fs.readFileSync(incomingPath);
        const stream = new Readable();
        stream.push(rawData);
        stream.push(null);
        return new StreamableFile(stream);
      }
    }

    throw new NotFoundException('Fichier introuvable dans le coffre-fort ni dans les imports');
  }

  async deleteFile(key: string): Promise<void> {
    if (!this.s3Client) {
      const safeKey = key.replace(/\//g, '_');
      const filePath = path.join(this.devStoragePath, safeKey);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return;
    }

    try {
      await this.s3Client.send(new DeleteObjectCommand({ Bucket: this.bucketName, Key: key }));
    } catch (error) {
      this.logger.error(`Storage Delete Error: ${error.message}`);
    }
  }
}
