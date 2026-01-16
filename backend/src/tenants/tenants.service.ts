
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DynamicConfigService } from '../dynamic-config.service';

@Injectable()
export class TenantsService {
    constructor(
        private prisma: PrismaService,
        private config: DynamicConfigService
    ) { }

    async findOne(id: string) {
        return this.prisma.tenant.findUnique({
            where: { id }
        });
    }

    async update(id: string, data: { retentionDays?: number }) {
        // Validate Retention Policy
        if (data.retentionDays) {
            const maxDays = Number(await this.config.get('retention.max_days')) || 90;
            if (data.retentionDays > maxDays) {
                throw new BadRequestException(`Retention duration cannot exceed the global limit of ${maxDays} days.`);
            }
            if (data.retentionDays < 1) {
                throw new BadRequestException('Retention duration must be at least 1 day.');
            }
        }

        return this.prisma.tenant.update({
            where: { id },
            data
        });
    }
}
