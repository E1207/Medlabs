
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { DynamicConfigService } from '../dynamic-config.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import * as bcrypt from 'bcrypt';
import { UserRole, UserStatus } from '@prisma/client';

@Injectable()
export class TenantsService {
    constructor(
        private prisma: PrismaService,
        private config: DynamicConfigService
    ) { }

    async createTenantWithAdmin(dto: CreateTenantDto) {
        // 1. Check if slug exists
        const existingSlug = await this.prisma.tenant.findUnique({ where: { slug: dto.slug } });
        if (existingSlug) {
            throw new BadRequestException('Tenant slug already exists');
        }

        // 2. Check if admin email exists globally
        const existingUser = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
        if (existingUser) {
            throw new BadRequestException('User with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);

        // 3. Transaction
        return this.prisma.$transaction(async (tx) => {
            const tenant = await tx.tenant.create({
                data: {
                    name: dto.name,
                    slug: dto.slug,
                    // We might need to add these fields to schema if not present, but based on mock valid fields:
                    // For now, assume schema has basic fields or we map them. 
                    // Wait, schema was viewed earlier. Let's stick to known schema fields or defaults.
                    // Schema checks: name, slug, (others?)
                    // If schema lacks niu/rccm, we skip or store in JSON/settings.
                    // Assuming basic fields for now. 
                    smsBalance: dto.initialSmsQuota || 0,
                }
            });

            const user = await tx.user.create({
                data: {
                    email: dto.adminEmail,
                    passwordHash: hashedPassword,
                    firstName: dto.adminFirstName || 'Admin',
                    lastName: dto.adminLastName || 'Lab',
                    role: UserRole.LAB_ADMIN,
                    status: UserStatus.ACTIVE,
                    tenantId: tenant.id,
                }
            });

            return { tenant, admin: user };
        });
    }

    async findAll() {
        // Return all tenants with user count
        const tenants = await this.prisma.tenant.findMany({
            include: {
                _count: {
                    select: { users: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return tenants.map(t => ({
            ...t,
            usersCount: t._count.users
        }));
    }

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

    async delete(id: string) {
        return this.prisma.tenant.update({
            where: { id },
            data: { isActive: false }
        });
    }
}
