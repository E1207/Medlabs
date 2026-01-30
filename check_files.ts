
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function main() {
    const tenants = await prisma.tenant.findMany({
        where: { isActive: true }
    });

    for (const tenant of tenants) {
        // @ts-ignore
        console.log(`Tenant: ${tenant.name}, Path: ${tenant.importFolderPath}`);
        // @ts-ignore
        if (tenant.importFolderPath && fs.existsSync(tenant.importFolderPath)) {
            // @ts-ignore
            const files = fs.readdirSync(tenant.importFolderPath);
            console.log(`Files in ${tenant.importFolderPath}:`);
            files.forEach(f => console.log(` - ${f}`));
        } else {
            console.log(`Path does not exist or not configured.`);
        }
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
