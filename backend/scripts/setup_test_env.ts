import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as bcrypt from 'bcrypt';

dotenv.config();

const prisma = new PrismaClient({});

async function main() {
    const tenantId = 'mock-tenant-id';
    const tenant = await prisma.tenant.upsert({
        where: { id: tenantId },
        update: {},
        create: {
            id: tenantId,
            name: 'Mock Tenant Lab',
            slug: 'mock-lab',
            structureType: 'PRIVATE_LAB',
        },
    });
    console.log('Upserted Mock Tenant:', tenant);

    // Also upsert a user if needed, but the guard mocks the user object, so userId 'mock-user-id' might need to exist if we have FK on uploadedBy?
    // User model: uploadedById String? @map("uploaded_by_id")
    // uploadedBy   User?   @relation(fields: [uploadedById], references: [id])
    // Yes, IF uploadedById is set in ResultsService, which it is: `uploadedById: userId` (user.id which is 'mock-user-id')

    const passwordHash = await bcrypt.hash('password123', 10);

    const userId = 'mock-user-id';
    await prisma.user.upsert({
        where: { id: userId },
        update: { passwordHash },
        create: {
            id: userId,
            email: 'mock@medlab.cm',
            passwordHash,
            tenantId: tenantId,
            role: 'TECHNICIAN',
            firstName: 'Mock',
            lastName: 'User'
        }
    });
    console.log('Upserted Mock User');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
