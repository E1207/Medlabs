const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) {
            console.log('No tenant found');
            return;
        }

        console.log('Testing with tenantId:', tenant.id);

        const take = 50;
        const skip = 0;
        const where = { tenantId: tenant.id };

        const results = await prisma.document.findMany({
            where,
            skip,
            take,
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                createdAt: true,
                patientFirstName: true,
                patientLastName: true,
                patientPhone: true,
                folderRef: true,
                status: true,
            }
        });

        console.log('Results count:', results.length);
    } catch (e) {
        console.error('Prisma Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

test();
