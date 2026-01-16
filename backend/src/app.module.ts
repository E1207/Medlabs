import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ResultsModule } from './results/results.module';
// PrismaService is now provided by DynamicConfigModule (Global) or we keep it here? 
// If DynamicConfigModule provides it, we can remove it here to avoid dual instantiation? 
// Or better: PrismaService should typically be in a PrismaModule or Global. 
// For now, let's just import DynamicConfigModule and remove DynamicConfigService from providers.
// We keep PrismaService here for clarity unless it conflicts.
import { PrismaService } from './prisma.service';
import { DynamicConfigModule } from './dynamic-config.module';
import { PlatformConfigController } from './platform-config.controller';
import { UsersModule } from './users/users.module';

import { ScheduleModule } from '@nestjs/schedule';
import { CleanupService } from './tasks/cleanup.service';
import { TenantsModule } from './tenants/tenants.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    DynamicConfigModule, // Imported here
    StorageModule,
    AuthModule,
    NotificationsModule,
    // NotificationsModule, // Removed duplicate
    ResultsModule,
    UsersModule,
    TenantsModule,
  ],
  controllers: [AppController, PlatformConfigController],
  providers: [AppService, CleanupService], // Removed DynamicConfigService, PrismaService (if exported by DynamicConfigModule)
})
export class AppModule { }
