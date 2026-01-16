
import { Module } from '@nestjs/common';
import { AdminUsersController } from './admin-users.controller';
import { PrismaService } from '../../prisma.service';

@Module({
    controllers: [AdminUsersController],
    providers: [PrismaService], // Or import a shared DB module
})
export class AdminUsersModule { }
