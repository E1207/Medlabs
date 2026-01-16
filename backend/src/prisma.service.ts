import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        // SECURITY: Disable SQL logging in production to prevent PHI leaks
        const isProduction = process.env.NODE_ENV === 'production';

        super({
            log: isProduction
                ? [] // No logging in production
                : [
                    { emit: 'event', level: 'query' },
                    { emit: 'stdout', level: 'info' },
                    { emit: 'stdout', level: 'warn' },
                    { emit: 'stdout', level: 'error' },
                ],
        });

        // Development-only query logging
        if (!isProduction) {
            (this as any).$on('query', (e: Prisma.QueryEvent) => {
                this.logger.debug(`Query: ${e.query}`);
                this.logger.debug(`Duration: ${e.duration}ms`);
            });
        }
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log(`Database connected [${process.env.NODE_ENV || 'development'}]`);
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
