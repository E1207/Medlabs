import { Controller, Get, Post, Body, UseGuards, UnauthorizedException } from '@nestjs/common';
import { DynamicConfigService } from './dynamic-config.service';
import { EmailService } from './notifications/email.service';
import { SmsService } from './notifications/sms.service';

// In a real app, you would use @UseGuards(JwtAuthGuard, RolesGuard) and @Roles('SUPER_ADMIN')
// For now, we'll keep it simple as role logic is mock on the frontend for now
@Controller('admin/config')
export class PlatformConfigController {
    constructor(
        private dynamicConfig: DynamicConfigService,
        private emailService: EmailService,
        private smsService: SmsService,
    ) { }

    @Get()
    async getConfig() {
        // Return masked values for secrets
        // This is a simplified version
        return {
            sms: {
                provider: this.dynamicConfig.get('sms.provider') || 'twilio',
                apiKey: this.dynamicConfig.get('sms.api_key') || '',
                apiSecret: '••••••••••••',
                baseUrl: this.dynamicConfig.get('sms.base_url') || '',
            },
            smtp: {
                host: this.dynamicConfig.get('smtp.host') || '',
                port: this.dynamicConfig.get('smtp.port') || 587,
                secure: this.dynamicConfig.get('smtp.secure') || true,
                user: this.dynamicConfig.get('smtp.user') || '',
                password: '••••••••••••',
                fromEmail: this.dynamicConfig.get('smtp.from_email') || '',
            },
            retention: {
                defaultDays: Number(await this.dynamicConfig.get('retention.default_days')) || 30,
                maxDays: Number(await this.dynamicConfig.get('retention.max_days')) || 90,
            },
            general: {
                maintenanceMode: await this.dynamicConfig.get('MAINTENANCE_MODE') === 'true',
                globalAnnouncement: await this.dynamicConfig.get('GLOBAL_ANNOUNCEMENT') || '',
            }
        };
    }

    @Post('save')
    async saveConfig(@Body() body: any) {
        if (body.sms) {
            if (body.sms.provider) await this.dynamicConfig.set('sms.provider', body.sms.provider);
            if (body.sms.apiKey) await this.dynamicConfig.set('sms.api_key', body.sms.apiKey);
            if (body.sms.apiSecret && body.sms.apiSecret !== '••••••••••••') {
                await this.dynamicConfig.set('sms.api_secret', body.sms.apiSecret, true);
            }
            if (body.sms.baseUrl) await this.dynamicConfig.set('sms.base_url', body.sms.baseUrl);
        }

        if (body.smtp) {
            if (body.smtp.host) await this.dynamicConfig.set('smtp.host', body.smtp.host);
            if (body.smtp.port) await this.dynamicConfig.set('smtp.port', String(body.smtp.port));
            if (body.smtp.secure !== undefined) await this.dynamicConfig.set('smtp.secure', String(body.smtp.secure));
            if (body.smtp.user) await this.dynamicConfig.set('smtp.user', body.smtp.user);
            if (body.smtp.password && body.smtp.password !== '••••••••••••') {
                await this.dynamicConfig.set('smtp.password', body.smtp.password, true);
            }
            if (body.smtp.fromEmail) await this.dynamicConfig.set('smtp.from_email', body.smtp.fromEmail);
        }

        if (body.retention) {
            if (body.retention.defaultDays) await this.dynamicConfig.set('retention.default_days', String(body.retention.defaultDays));
            if (body.retention.maxDays) await this.dynamicConfig.set('retention.max_days', String(body.retention.maxDays));
        }

        if (body.general) {
            await this.dynamicConfig.set('MAINTENANCE_MODE', String(body.general.maintenanceMode));
            await this.dynamicConfig.set('GLOBAL_ANNOUNCEMENT', body.general.globalAnnouncement || '');
        }

        return { success: true };
    }

    @Post('test-sms')
    async testSms(@Body('phone') phone: string) {
        await this.smsService.sendOtp(phone || '+237600000000', 'TEST-123');
        return { success: true, message: 'Test SMS sent' };
    }

    @Post('test-email')
    async testEmail(@Body('email') email: string) {
        await this.emailService.sendTestEmail(email || 'admin@medlab.cm');
        return { success: true, message: 'Test email sent' };
    }
}
