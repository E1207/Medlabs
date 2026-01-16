import { Module } from '@nestjs/common';
import { ResultsService } from './results.service';
import { ResultsController } from './results.controller';
import { StorageModule } from '../storage/storage.module';
import { PrismaService } from '../prisma.service';

import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [StorageModule, NotificationsModule, AuthModule],
    controllers: [ResultsController],
    providers: [ResultsService, PrismaService],
})
export class ResultsModule { }
