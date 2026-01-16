import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');
    // Password hash for 'pass123'
    const passwordHash = await bcrypt.hash('pass123', 10);

    // 1. Create Tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'demo-lab' },
        update: {},
        create: {
            name: 'Demo Lab',
            slug: 'demo-lab',
            smsSenderId: 'L_DEMO',
            smsBalance: 100,
        },
    });

    console.log(`Tenant created: ${tenant.name}`);

    // 2. Create Super Admin
    const superAdmin = await prisma.user.upsert({
        where: { email: 'admin@medlab.cm' },
        update: {
            passwordHash: passwordHash,
            role: UserRole.SUPER_ADMIN,
            status: 'ACTIVE'
        },
        create: {
            email: 'admin@medlab.cm',
            passwordHash: passwordHash, // Hashed password
            firstName: 'Super',
            lastName: 'Admin',
            role: UserRole.SUPER_ADMIN,
            status: 'ACTIVE',
        },
    });

    console.log(`Super Admin created: ${superAdmin.email}`);

    // 3. Create Lab Admin
    const labAdmin = await prisma.user.upsert({
        where: { email: 'lab@medlab.cm' },
        update: {
            passwordHash: passwordHash,
            role: UserRole.LAB_ADMIN,
            tenantId: tenant.id,
            status: 'ACTIVE'
        },
        create: {
            email: 'lab@medlab.cm',
            passwordHash: passwordHash, // Hashed password
            firstName: 'Lab',
            lastName: 'Manager',
            role: UserRole.LAB_ADMIN,
            tenantId: tenant.id,
            status: 'ACTIVE',
        },
    });

    console.log(`Lab Admin created: ${labAdmin.email}`);

    // 4. Create Technician
    const tech = await prisma.user.upsert({
        where: { email: 'tech@medlab.cm' },
        update: {
            passwordHash: passwordHash,
            role: UserRole.TECHNICIAN,
            tenantId: tenant.id,
            status: 'ACTIVE'
        },
        create: {
            email: 'tech@medlab.cm',
            passwordHash: passwordHash,
            firstName: 'Technicien',
            lastName: 'Demo',
            role: UserRole.TECHNICIAN,
            tenantId: tenant.id,
            status: 'ACTIVE',
        },
    });
    console.log(`Technician created: ${tech.email}`);

    // 5. Create Sample Documents (Results)
    const docs = [
        {
            folderRef: 'DOS-2024-001',
            patientFirstName: 'Jean',
            patientLastName: 'Dupont',
            patientEmail: 'jean.dupont@email.com',
            patientPhone: '+237699001122',
            fileKey: 'demo/result1.pdf',
            fileSize: 1024 * 500, // 500KB
            status: 'UPLOADED',
        },
        {
            folderRef: 'DOS-2024-002',
            patientFirstName: 'Marie',
            patientLastName: 'Curie',
            patientEmail: 'marie@science.com',
            patientPhone: '+237677554433',
            fileKey: 'demo/result2.pdf',
            fileSize: 1024 * 1200, // 1.2MB
            status: 'NOTIFIED',
        },
        {
            folderRef: 'DOS-2024-003',
            patientFirstName: 'Paul',
            patientLastName: 'Martin',
            patientEmail: 'paul.martin@test.cm',
            patientPhone: '+237699887766',
            fileKey: 'demo/result3.pdf',
            fileSize: 1024 * 250, // 250KB
            status: 'DELIVERED',
        }
    ];

    for (const doc of docs) {
        // We use 'create' here because we don't have a unique key other than ID to upsert easily on folderRef (unless unique constraint exists)
        // Checking if exists first to avoid duplicates on re-seed
        const exists = await prisma.document.findFirst({
            where: { folderRef: doc.folderRef, tenantId: tenant.id }
        });

        if (!exists) {
            await prisma.document.create({
                data: {
                    tenantId: tenant.id,
                    folderRef: doc.folderRef,
                    fileKey: doc.fileKey,
                    fileSize: doc.fileSize,
                    patientFirstName: doc.patientFirstName,
                    patientLastName: doc.patientLastName,
                    patientEmail: doc.patientEmail,
                    patientPhone: doc.patientPhone,
                    status: doc.status as any,
                    uploadedById: tech.id, // Correct field
                    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days expiry
                }
            });
            console.log(`Document created: ${doc.folderRef}`);
        } else {
            console.log(`Document already exists: ${doc.folderRef}`);
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
