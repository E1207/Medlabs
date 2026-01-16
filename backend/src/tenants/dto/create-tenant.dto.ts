export class CreateTenantDto {
    name: string;
    slug: string;
    // Optional contact fields
    niu?: string;
    rccm?: string;
    contactEmail?: string;
    initialSmsQuota?: number;

    // Admin User Details
    adminEmail: string;
    adminPassword: string;
    adminFirstName?: string;
    adminLastName?: string;
}
