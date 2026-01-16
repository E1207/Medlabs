
import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { UsersService, CreateUserDto, UpdateUserDto } from './users.service';
import { AuthService } from '../auth/auth.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
    ) { }

    @Get()
    @Roles('SUPER_ADMIN', 'LAB_ADMIN')
    async findAll(@Request() req: any) {
        const user = req.user;
        const tenantId = user.role === 'LAB_ADMIN' ? user.tenantId : undefined;
        // If Super Admin wants to filter, they can pass query params, handled in service 
        // (For now, Super Admin sees all if no query, Lab Admin sees only theirs)

        // TODO: Pass query params for search/pagination
        return this.usersService.findAll({ tenantId });
    }

    @Post()
    @Roles('SUPER_ADMIN', 'LAB_ADMIN')
    async create(@Request() req: any, @Body() createDto: CreateUserDto) {
        const user = req.user;

        // RBAC: Lab Admin can only create for their tenant
        if (user.role === 'LAB_ADMIN') {
            if (createDto.tenantId && createDto.tenantId !== user.tenantId) {
                throw new ForbiddenException('Cannot create user for another tenant');
            }
            createDto.tenantId = user.tenantId; // Enforce tenant

            // RBAC: Lab Admin cannot create Super Admin or Lab Admin (optional, maybe allow Lab Admin creation?)
            // Requirement says: Technician or Viewer only.
            if (createDto.role === 'SUPER_ADMIN' || createDto.role === 'LAB_ADMIN') {
                throw new ForbiddenException('Lab Admins can only create Technicians or Viewers');
            }
        }

        return this.usersService.create(createDto);
    }

    @Patch(':id')
    @Roles('SUPER_ADMIN', 'LAB_ADMIN')
    async update(@Request() req: any, @Param('id') id: string, @Body() updateDto: UpdateUserDto) {
        const currentUser = req.user;
        const targetUser = await this.usersService.findOne(id);

        if (!targetUser) {
            throw new BadRequestException('User not found');
        }

        // Security Guard
        if (currentUser.role === 'LAB_ADMIN') {
            // 1. Scope: Must be same tenant
            if (targetUser.tenantId !== currentUser.tenantId) {
                throw new ForbiddenException('Access denied to this user');
            }
            // 2. Privilege: Cannot promote to Super Admin
            if (updateDto.role === 'SUPER_ADMIN') {
                throw new ForbiddenException('Cannot promote users to Super Admin');
            }
        }

        return this.usersService.update(id, updateDto);
    }

    @Post(':id/reset-password')
    @Roles('SUPER_ADMIN', 'LAB_ADMIN')
    async resetPassword(@Request() req: any, @Param('id') id: string) {
        const currentUser = req.user;
        const targetUser = await this.usersService.findOne(id);

        if (!targetUser) throw new BadRequestException('User not found');

        if (currentUser.role === 'LAB_ADMIN' && targetUser.tenantId !== currentUser.tenantId) {
            throw new ForbiddenException('Access denied');
        }

        return this.authService.requestPasswordReset(targetUser.email);
    }
}
