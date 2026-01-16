import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  async sendOtp(phoneNumber: string, code: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[SMS MOCK] Sending code ${code} to ${phoneNumber}`);
      return;
    }

    // TODO: Integrate actual SMS provider (Twilio/Vonage)
    this.logger.warn(`SMS provider not integrated. Code ${code} for ${phoneNumber} was NOT sent.`);
  }
  async sendResultNotification(to: string, patientName: string, folderRef: string, link: string): Promise<void> {
    const message = `MedLab: Bonjour ${patientName}, votre résultat (Dossier ${folderRef}) est disponible ici: ${link}`;

    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`[SMS MOCK] To: ${to} | Msg: ${message}`);
      return;
    }

    // TODO: Integrate actual SMS provider
    this.logger.warn(`SMS provider not integrated. Message to ${to} was NOT sent.`);
  }
}
