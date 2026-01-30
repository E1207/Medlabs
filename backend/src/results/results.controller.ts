import { Controller, Post, Get, Patch, Delete, UseGuards, UseInterceptors, UploadedFile, Body, Query, Param, Header } from '@nestjs/common';
import { ResultsService } from './results.service';
import { CreateResultDto } from './dto/create-result.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard, RolesGuard, Roles, User } from '../auth/guards';
import { UserRole } from '@prisma/client';
import { FolderImportService } from './folder-import.service';

@Controller('results')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultsController {
    constructor(
        private readonly resultsService: ResultsService,
        private readonly folderImportService: FolderImportService,
    ) { }

    @Get()
    @Roles('TECHNICIAN', 'LAB_ADMIN', 'SUPER_ADMIN')
    findAll(
        @User() user: any,
        @Query('search') search?: string,
        @Query('page') page?: number,
    ) {
        return this.resultsService.findAll(user.tenantId, search, page);
    }

    @Get(':id/preview')
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    getPreviewUrl(@User() user: any, @Param('id') id: string) {
        return this.resultsService.getPreviewUrl(user.tenantId, id);
    }

    @Patch(':id/resend')
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    resend(
        @User() user: any,
        @Param('id') id: string,
        @Body('phone') phone: string,
    ) {
        return this.resultsService.resendResult(user.tenantId, id, phone, user.id);
    }

    @Post()
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    @UseInterceptors(FileInterceptor('file'))
    create(
        @User() user: any,
        @Body() createResultDto: CreateResultDto,
        @UploadedFile() file: Express.Multer.File,
    ) {
        // Force tenantId from authenticated user
        const tenantId = user.tenantId;
        return this.resultsService.create(createResultDto, file, tenantId, user.id);
    }

    @Patch(':id/complete')
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    completeImported(
        @User() user: any,
        @Param('id') id: string,
        @Body() updateDto: CreateResultDto,
    ) {
        return this.resultsService.completeImported(user.tenantId, id, updateDto, user.id);
    }

    @Post('scan-folder')
    @Roles('TECHNICIAN', 'LAB_ADMIN')
    async manualScan(@User() user: any) {
        return this.folderImportService.manualScan(user.tenantId);
    }

    @Get('view-secure')
    @Roles('TECHNICIAN', 'LAB_ADMIN', 'SUPER_ADMIN')
    @Header('Content-Type', 'application/pdf')
    @Header('Content-Disposition', 'inline')
    async viewSecure(@Query('key') key: string) {
        return this.resultsService.getFileStream(key);
    }

    @Delete(':id')
    @Roles('LAB_ADMIN', 'SUPER_ADMIN')
    remove(@User() user: any, @Param('id') id: string) {
        return this.resultsService.remove(user.tenantId, id);
    }
}
