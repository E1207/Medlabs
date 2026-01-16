
import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard, RolesGuard, Roles } from '../auth/guards';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
    constructor(private auditService: AuditService) { }

    @Get()
    @Roles('SUPER_ADMIN')
    async findAll() {
        return this.auditService.findAll();
    }
}
