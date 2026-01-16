import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class CreateResultDto {
    @IsNotEmpty()
    @IsString()
    folderRef: string;

    @IsNotEmpty()
    @Matches(/^\+?[1-9]\d{1,14}$/, {
        message: 'patientPhone must be a valid E.164 number (e.g., +2376...).',
    })
    patientPhone: string;

    @IsNotEmpty()
    @IsEmail()
    patientEmail: string;

    @IsString()
    @IsNotEmpty()
    patientName: string; // Added field for completeness based on logic

    @IsString()
    @IsNotEmpty()
    patientDob: string; // YYYY-MM-DD
}
