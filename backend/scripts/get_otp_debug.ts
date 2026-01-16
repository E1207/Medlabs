import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    const otp = await prisma.otpStore.findFirst({
        orderBy: { expiresAt: 'desc' },
    });

    if (otp) {
        console.log(`Latest OTP Hash: ${otp.codeHash}`);
        console.log('NOTE: Since the code is hashed, I cannot retrieve the plain text code from DB for manual verification unless I stored it plain text or logged it. The mock SMS service logged it to console.');
        // Wait, the OtpStore stores the HASH. 
        // The challenge endpoint generates a code, hashes it, saves hash, and sends plain code via SMS.
        // So reading DB won't give me the code.
        // I MUST read the logs or patch the service to store plain code for dev?
        // Or I rely on the log being visible in command_status.
    } else {
        console.log('No OTP found.');
    }
}
// Actually, for E2E testing without SMS, I should modify SmsService (or use the console log).
// The user said "Retrieve OTP from the console logs".
// I will stick to logs.
