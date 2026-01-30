import { PrismaClient, DocumentStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Noms camerounais réalistes
const firstNames = ['Alain', 'Marie', 'Paul', 'Jeanne', 'François', 'Sylvie', 'Emmanuel', 'Rose', 'Pierre', 'Brigitte', 'Jean', 'Cécile', 'Joseph', 'Marguerite', 'André', 'Thérèse', 'Samuel', 'Florence', 'David', 'Patricia'];
const lastNames = ['Nkomo', 'Fotso', 'Tchamba', 'Mbarga', 'Essomba', 'Onana', 'Ndongo', 'Beyala', 'Kamga', 'Nguema', 'Atangana', 'Mbassi', 'Mvondo', 'Ngoumou', 'Eko', 'Abanda', 'Tabi', 'Manga', 'Owona', 'Fouda'];

// Distribution réaliste des statuts (majorité succès)
const statusWeights: { status: DocumentStatus; weight: number }[] = [
    { status: 'SENT', weight: 15 },
    { status: 'CONSULTED', weight: 75 },
    { status: 'FAILED', weight: 10 },
];

function getRandomStatus(): DocumentStatus {
    const total = statusWeights.reduce((sum, sw) => sum + sw.weight, 0);
    let random = Math.random() * total;
    for (const sw of statusWeights) {
        random -= sw.weight;
        if (random <= 0) return sw.status;
    }
    return 'CONSULTED';
}

function getRandomPhone(): string {
    const prefixes = ['237690', '237691', '237699', '237670', '237677', '237650', '237651'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(100000 + Math.random() * 900000);
    return `+${prefix}${number}`;
}

function getRandomDate(daysBack: number): Date {
    const now = new Date();
    const randomDays = Math.floor(Math.random() * daysBack);
    const randomHours = Math.floor(Math.random() * 24);
    const randomMinutes = Math.floor(Math.random() * 60);
    const date = new Date(now);
    date.setDate(date.getDate() - randomDays);
    date.setHours(randomHours, randomMinutes, 0, 0);
    return date;
}

async function seedDashboardData() {
    console.log('🚀 Provisioning dashboard data...\n');

    // 1. Get Demo Lab tenant
    const tenant = await prisma.tenant.findUnique({
        where: { slug: 'demo-lab' }
    });

    if (!tenant) {
        console.error('❌ Tenant "demo-lab" not found. Run `npx prisma db seed` first.');
        return;
    }

    // 2. Get technician user
    const tech = await prisma.user.findUnique({
        where: { email: 'tech@medlab.cm' }
    });

    if (!tech) {
        console.error('❌ Technician not found. Run `npx prisma db seed` first.');
        return;
    }

    // 3. Delete old demo data (optional - clean slate)
    const deleted = await prisma.document.deleteMany({
        where: {
            tenantId: tenant.id,
            folderRef: { startsWith: 'SEED-' }
        }
    });
    console.log(`🗑️  Supprimé ${deleted.count} anciens documents de test.\n`);

    // 4. Update tenant SMS balance
    await prisma.tenant.update({
        where: { id: tenant.id },
        data: { smsBalance: 4500 }
    });
    console.log('💳 Solde SMS mis à jour: 4500 crédits\n');

    // 5. Generate 100 documents over last 7 days
    const documentsToCreate = 100;
    let created = 0;
    const statusCounts: Record<string, number> = {};

    for (let i = 0; i < documentsToCreate; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const status = getRandomStatus();
        const createdAt = getRandomDate(7);

        statusCounts[status] = (statusCounts[status] || 0) + 1;

        await prisma.document.create({
            data: {
                tenantId: tenant.id,
                folderRef: `SEED-${Date.now()}-${i}`,
                fileKey: `demo/result-${i}.pdf`,
                fileSize: Math.floor(100000 + Math.random() * 2000000),
                patientFirstName: firstName,
                patientLastName: lastName,
                patientEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.cm`,
                patientPhone: getRandomPhone(),
                status: status,
                uploadedById: tech.id,
                createdAt: createdAt,
                expiresAt: new Date(createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
            }
        });
        created++;
    }

    console.log(`✅ ${created} documents créés avec la répartition suivante:\n`);
    for (const [status, count] of Object.entries(statusCounts)) {
        const bar = '█'.repeat(Math.round(count / 2));
        console.log(`   ${status.padEnd(12)} ${count.toString().padStart(3)} ${bar}`);
    }

    // Calculate stats preview
    const totalToday = await prisma.document.count({
        where: {
            tenantId: tenant.id,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
    });

    const totalDocs = await prisma.document.count({
        where: { tenantId: tenant.id }
    });

    console.log(`\n📊 Statistiques du tenant "${tenant.name}":`);
    console.log(`   - Total documents: ${totalDocs}`);
    console.log(`   - Documents aujourd'hui: ${totalToday}`);
    console.log(`   - Solde SMS: 4500 crédits`);
    console.log(`\n🎉 Provisionnement terminé ! Rafraîchissez le dashboard.\n`);
}

seedDashboardData()
    .catch((e) => {
        console.error('❌ Erreur:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
