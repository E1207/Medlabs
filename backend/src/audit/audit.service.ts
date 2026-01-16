
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(action: AuditAction, description: string, actorId?: string, tenantId?: string, resourceId?: string) {
        return this.prisma.auditLog.create({
            data: {
                action,
                description,
                actorId,
                tenantId,
                resourceId
            }
        });
    }

    async findAll(tenantId?: string) {
        return this.prisma.auditLog.findMany({
            where: tenantId ? { tenantId } : {},
            orderBy: { createdAt: 'desc' },
            include: {
                tenant: { select: { name: true } }
            },
            take: 100 // Limit to last 100 for now
        });
    }
}
