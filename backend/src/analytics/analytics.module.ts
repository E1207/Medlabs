import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma.service';

@Module({
    imports: [CacheModule.register()],
    controllers: [AnalyticsController],
    providers: [AnalyticsService, PrismaService],
})
export class AnalyticsModule { }
