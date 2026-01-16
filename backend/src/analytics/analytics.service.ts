import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '../prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
    constructor(
        private prisma: PrismaService,
        @Inject(CACHE_MANAGER) private cacheManager: Cache
    ) { }

    async getSummary(tenantId?: string) {
        const cacheKey = `analytics:summary:${tenantId || 'all'}`;
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
            return cached;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        // Filter Clause
        const where: Prisma.DocumentWhereInput = tenantId ? { tenantId } : {};

        // 1. Total Documents Today
        const totalToday = await this.prisma.document.count({
            where: { ...where, createdAt: { gte: today } },
        });

        // 2. Stats (Failure Rate & Open Rate - Context: All time or Last 30 days? 
        // Usually User wants "General Health". Let's do Last 30 Days for rates to be relevant but not historic.)
        // Actually user said "Failure Rate: Percentage of SMS failed in the last 24h"
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentDocs = await this.prisma.document.groupBy({
            by: ['status'],
            where: { ...where, createdAt: { gte: twentyFourHoursAgo } },
            _count: true,
        });

        const totalRecent = recentDocs.reduce((acc: number, curr: any) => acc + curr._count, 0);
        const failedRecent = recentDocs.find((d: any) => d.status === 'FAILED')?._count || 0;
        const failureRate = totalRecent > 0 ? ((failedRecent / totalRecent) * 100).toFixed(1) : '0.0';

        // Open Rate (All Time or meaningful window - let's stick to general meaningful window e.g. 7 days or 30 days ?)
        // Request says "Percentage of documents with status 'OPENED'". Doesn't specify time window.
        // Let's use All Time for "Open Rate" unless it's too heavy. 
        // Given "1 million records", let's use Last 30 Days for performance relevance.
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // Using Count for Open Rate
        const openStats = await this.prisma.document.groupBy({
            by: ['status'],
            where: { ...where, createdAt: { gte: thirtyDaysAgo } },
            _count: true,
        });

        const totalMonth = openStats.reduce((acc: number, curr: any) => acc + curr._count, 0);
        const openedMonth = openStats.find((d: any) => d.status === 'OPENED')?._count || 0;
        const openRate = totalMonth > 0 ? ((openedMonth / totalMonth) * 100).toFixed(1) : '0.0';


        // 3. SMS Credits
        let smsBalance = 0;
        if (tenantId) {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { smsBalance: true }
            });
            smsBalance = tenant?.smsBalance || 0;
        } else {
            // Super Admin - sum all? Or just 0.
            // Let's return sum of all for fun, or 0.
            const sum = await this.prisma.tenant.aggregate({
                _sum: { smsBalance: true }
            });
            smsBalance = sum._sum?.smsBalance || 0;
        }



        // 4. Chart Data (Last 7 Days)
        // We need grouping by Day + Status (Sent vs Opened vs Failed)
        // Status mapping: 
        // "Sent" = UPLOADED + NOTIFIED + DELIVERED + OPENED (Technically all these were "Sent")
        // "Opened" = OPENED
        // "Failed" = FAILED

        // We will use a raw query for performance and easy date truncation
        // Prisma Raw Query needs specific syntax for parameters.

        // Note: SQL syntax depends on DB. We assume PostgreSQL per docker-compose.
        // $1 = tenantId, $2 = sevenDaysAgo

        let chartDataRaw: any[];

        if (tenantId) {
            chartDataRaw = await this.prisma.$queryRaw`
            SELECT 
                to_char("created_at", 'Dy') as day_name,
                DATE("created_at") as day_date,
                "status",
                COUNT(*)::int as count
            FROM "documents"
            WHERE "tenant_id" = ${tenantId}
            AND "created_at" >= ${sevenDaysAgo}
            GROUP BY 1, 2, 3
            ORDER BY 2 ASC
        `;
        } else {
            chartDataRaw = await this.prisma.$queryRaw`
            SELECT 
                to_char("created_at", 'Dy') as day_name,
                DATE("created_at") as day_date,
                "status",
                COUNT(*)::int as count
            FROM "documents"
            WHERE "created_at" >= ${sevenDaysAgo}
            GROUP BY 1, 2, 3
            ORDER BY 2 ASC
        `;
        }

        // Process Raw Data into Chart Format [{ date: 'Mon', sent: 50, opened: 40, failed: 2 }]
        const dayMap = new Map<string, { date: string, sent: number, opened: number, failed: number }>();

        // Initializing the last 7 days map to ensure no gaps
        for (let i = 0; i < 7; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
            const dayKey = d.toISOString().split('T')[0]; // Use YYYY-MM-DD as key
            dayMap.set(dayKey, { date: dayName, sent: 0, opened: 0, failed: 0 });
        }

        chartDataRaw.forEach((row: any) => {
            // row.day_date is a Date object or string depending on driver
            const dateStr = new Date(row.day_date).toISOString().split('T')[0];
            const status = row.status;
            const count = row.count;

            if (dayMap.has(dateStr)) {
                const entry = dayMap.get(dateStr)!;
                if (status === 'FAILED') {
                    entry.failed += count;
                } else if (status === 'OPENED') {
                    entry.opened += count;
                    entry.sent += count; // Opened implies sent
                } else {
                    // UPLOADED, NOTIFIED, DELIVERED
                    entry.sent += count;
                }
            }
        });

        const chartData = Array.from(dayMap.values());

        const result = {
            stats: {
                totalToday,
                failureRate,
                openRate,
                smsBalance
            },
            chartData
        };

        // Cache for 300 seconds (5 minutes)
        await this.cacheManager.set(cacheKey, result, 300 * 1000); // v5 uses milliseconds usually, v4 seconds? 
        // nestjs/cache-manager v2+ wraps cache-manager v5. cache-manager v5 uses ms.
        // Let's assume ms to be safe. 300 * 1000.
        // If it's old cache-manager (v4), it used seconds. But "npm install cache-manager" installs latest.

        return result;
    }
}
