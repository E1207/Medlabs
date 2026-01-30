import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateTenantDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    address?: string;

    @IsNumber()
    @IsOptional()
    @Min(7)
    configuredRetentionDays?: number;

    @IsString()
    @IsOptional()
    importFolderPath?: string;
}
