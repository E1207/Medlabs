import { JwtService } from '@nestjs/jwt';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const prisma = new PrismaClient({});

async function main() {
    // Find the last uploaded document
    const doc = await prisma.document.findFirst({
        orderBy: { createdAt: 'desc' }
    });

    if (!doc) {
        console.log("No document found.");
        return;
    }

    const jwtService = new JwtService({});
    const payload = { sub: doc.id, type: 'guest_access' };
    const token = jwtService.sign(payload, {
        secret: process.env.PATIENT_JWT_SECRET || 'dev_secret_key_123',
        expiresIn: '48h',
    });

    console.log(`Document ID: ${doc.id}`);
    console.log(`Magic Link Token: ${token}`);
    console.log(`Magic Link URL: ${process.env.APP_BASE_URL || 'http://localhost:5173'}/guest/access?token=${token}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
