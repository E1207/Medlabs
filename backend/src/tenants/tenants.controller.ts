
import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Request, UnauthorizedException, Param } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
    constructor(private tenantsService: TenantsService) { }

    // --- Routes prioritaires (statiques) ---

    @Get('me')
    @Roles('LAB_ADMIN', 'TECHNICIAN', 'VIEWER')
    async getMyTenant(@Request() req: any) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.findOne(tenantId);
    }

    @Patch('me')
    @Roles('LAB_ADMIN')
    async updateMyTenant(@Request() req: any, @Body() body: UpdateTenantDto) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.update(tenantId, body);
    }

    // --- Routes d'administration générale ---

    @Post()
    @Roles('SUPER_ADMIN')
    async create(@Body() createTenantDto: CreateTenantDto) {
        return this.tenantsService.createTenantWithAdmin(createTenantDto);
    }

    @Get()
    @Roles('SUPER_ADMIN')
    async findAll() {
        return this.tenantsService.findAll();
    }

    @Patch(':id')
    @Roles('SUPER_ADMIN')
    async updateTenant(@Param('id') id: string, @Body() body: any) {
        return this.tenantsService.update(id, body);
    }

    @Delete(':id')
    @Roles('SUPER_ADMIN')
    async deleteTenant(@Param('id') id: string) {
        return this.tenantsService.delete(id);
    }
}
