
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '../../auth/guards';
import { PrismaService } from '../../prisma.service';
import { CreateAdminUserDto, UpdateAdminUserDto } from './dto/admin-user.dto';
import * as bcrypt from 'bcrypt';
import { UserStatus } from '@prisma/client';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminUsersController {
    constructor(private prisma: PrismaService) { }

    @Get()
    async findAll(@Query('search') search?: string, @Query('role') role?: string) {
        const where: any = {};

        if (search) {
            where.OR = [
                { email: { contains: search, mode: 'insensitive' } },
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
                { tenant: { name: { contains: search, mode: 'insensitive' } } }
            ];
        }

        if (role) {
            where.role = role;
        }

        return this.prisma.user.findMany({
            where: {
                ...where,
                deletedAt: null // Only active users
            },
            include: {
                tenant: { select: { id: true, name: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    @Post()
    async create(@Body() dto: CreateAdminUserDto) {
        // Validation
        const existing = await this.prisma.user.findFirst({
            where: {
                email: dto.email,
                deletedAt: null // Check against active users only? Or global? Ideally global unique email.
            }
        });
        if (existing) throw new BadRequestException('Email already exists');

        if (dto.role !== 'SUPER_ADMIN' && !dto.tenantId) {
            throw new BadRequestException('Tenant ID is required for non-Super Admins');
        }

        const password = dto.password || Math.random().toString(36).slice(-8); // Fallback generic
        const hash = await bcrypt.hash(password, 10);

        return this.prisma.user.create({
            data: {
                email: dto.email,
                firstName: dto.firstName,
                lastName: dto.lastName,
                role: dto.role,
                tenantId: dto.tenantId,
                passwordHash: hash,
                status: UserStatus.ACTIVE // Default active
            }
        });
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
        const data: any = { ...dto };

        if (dto.password) {
            data.passwordHash = await bcrypt.hash(dto.password, 10);
            delete data.password;
        }

        return this.prisma.user.update({
            where: { id },
            data
        });
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        // Soft Delete Implementation
        return this.prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), status: UserStatus.SUSPENDED }
        });
    }
}
