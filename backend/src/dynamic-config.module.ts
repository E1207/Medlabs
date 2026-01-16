import { Module, Global } from '@nestjs/common';
import { DynamicConfigService } from './dynamic-config.service';
import { PrismaService } from './prisma.service';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
    providers: [DynamicConfigService, PrismaService], // Check if PrismaService should be here or imported
    exports: [DynamicConfigService, PrismaService],
})
export class DynamicConfigModule { }
