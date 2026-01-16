import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';
import { UserRole } from '@prisma/client';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('summary')
    @Roles(UserRole.LAB_ADMIN, UserRole.SUPER_ADMIN)
    async getSummary(@Request() req: any) {
        // For SUPER_ADMIN, we might want to allow filtering by tenantId in query params,
        // but for now, if LAB_ADMIN, use their tenantId.
        const tenantId = req.user.tenantId;
        return this.analyticsService.getSummary(tenantId);
    }
}
