
import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { PrismaService } from '../prisma.service';

@Global() // Make it global so other modules can easily log
@Module({
    controllers: [AuditController],
    providers: [AuditService, PrismaService],
    exports: [AuditService],
})
export class AuditModule { }
