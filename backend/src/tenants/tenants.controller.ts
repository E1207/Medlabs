
import { Controller, Get, Patch, Body, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
    constructor(private tenantsService: TenantsService) { }

    @Get('me')
    @Roles('LAB_ADMIN', 'TECHNICIAN', 'VIEWER')
    async getMyTenant(@Request() req: any) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.findOne(tenantId);
    }

    @Patch('me')
    @Roles('LAB_ADMIN')
    async updateMyTenant(@Request() req: any, @Body() body: { retentionDays?: number }) {
        const tenantId = req.user.tenantId;
        if (!tenantId) throw new UnauthorizedException('User is not associated with a tenant');
        return this.tenantsService.update(tenantId, body);
    }
}
