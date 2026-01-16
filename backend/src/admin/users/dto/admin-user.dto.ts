
import { UserRole, UserStatus } from '@prisma/client';

export class CreateAdminUserDto {
    email: string;
    password?: string; // Optional, can be auto-generated
    firstName: string;
    lastName: string;
    role: UserRole;
    tenantId?: string; // Nullable for Platform Staff
}

export class UpdateAdminUserDto {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
    status?: UserStatus;
    password?: string; // Admin Override
    tenantId?: string; // Move user?? Rare but possible.
}
