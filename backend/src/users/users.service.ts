
import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../notifications/email.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserStatus } from '@prisma/client';

export type UserRole = 'SUPER_ADMIN' | 'LAB_ADMIN' | 'TECHNICIAN' | 'VIEWER';

export class CreateUserDto {
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    tenantId?: string;
}

export class UpdateUserDto {
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    status?: UserStatus;
}

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private emailService: EmailService,
    ) { }

    async create(data: CreateUserDto) {
        const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
        if (existing) {
            throw new ConflictException('User with this email already exists');
        }

        // Generate temporary password or simple default
        const tempPassword = uuidv4().substring(0, 8);
        const hash = await bcrypt.hash(tempPassword, 10);

        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                firstName: data.firstName,
                lastName: data.lastName,
                role: data.role,
                tenantId: data.tenantId,
                passwordHash: hash,
                status: UserStatus.INVITED,
            },
        });

        // Send Invitation Email
        // For now, we reuse password reset logic or just log invitation link
        // Ideally: sendAdminInvitation equivalent
        const setupLink = `${process.env.APP_BASE_URL || 'http://localhost:5173'}/login?email=${data.email}`;

        // We'll use a generic invite capable method or add one to EmailService later
        // For this task, let's assume we notify them.
        // this.emailService.sendInvitation(user.email, tempPassword); 

        return user;
    }

    async findAll(params: { tenantId?: string, search?: string }) {
        const { tenantId, search } = params;

        const where: any = {};
        if (tenantId) where.tenantId = tenantId;

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
            ];
        }

        return this.prisma.user.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                status: true,
                lastLoginAt: true,
                tenant: { select: { name: true, id: true } }
            }
        });
    }

    async findOne(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
        });
    }

    async update(id: string, data: UpdateUserDto) {
        return this.prisma.user.update({
            where: { id },
            data,
        });
    }

    async delete(id: string) {
        return this.prisma.user.delete({ where: { id } });
    }
}
