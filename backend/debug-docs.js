const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const docs = await prisma.document.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
            id: true,
            fileKey: true,
            status: true,
            folderRef: true
        }
    });
    console.log(JSON.stringify(docs, null, 2));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
