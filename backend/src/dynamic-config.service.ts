import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

@Injectable()
export class DynamicConfigService implements OnModuleInit {
    private configCache: Map<string, string> = new Map();

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
    ) { }

    async onModuleInit() {
        await this.refreshCache();
    }

    /**
     * Refreshes the local cache from the database.
     * This is called on bootstrap and can be triggered via an endpoint
     * after manual database updates or via a Super Admin setting.
     */
    async refreshCache() {
        // @ts-ignore - Prisma might need a full restart/re-index to recognize the new model in some IDEs
        const configs = await (this.prisma as any).systemConfig.findMany();
        this.configCache.clear();
        configs.forEach((cfg: any) => {
            this.configCache.set(cfg.key, cfg.value);
        });
    }

    /**
     * Gets a configuration value.
     * Priority: Database > Environment Variable
     */
    get<T = string>(key: string): T {
        // 1. Check database cache
        const dbValue = this.configCache.get(key);
        if (dbValue !== undefined) {
            return this.castValue<T>(dbValue);
        }

        // 2. Fallback to ConfigService (.env)
        return this.configService.get<T>(key)!;
    }

    private castValue<T>(value: string): T {
        if (value === 'true') return true as unknown as T;
        if (value === 'false') return false as unknown as T;
        if (!isNaN(Number(value)) && value.trim() !== '') return Number(value) as unknown as T;
        return value as unknown as T;
    }

    /**
     * Updates a configuration value in the database and refreshes cache.
     */
    async set(key: string, value: string, isSecret = false) {
        await (this.prisma as any).systemConfig.upsert({
            where: { key },
            update: { value, isSecret },
            create: { key, value, isSecret },
        });
        this.configCache.set(key, value);
    }
}
