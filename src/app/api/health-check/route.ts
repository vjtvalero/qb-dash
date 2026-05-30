import { NextResponse } from 'next/server';
import { services } from '@/lib/services';
import { HealthCheckResult } from '@/types';

export async function GET() {
  const checkable = services.filter((s) => s.healthCheck);

  const results: HealthCheckResult[] = await Promise.all(
    checkable.map(async (s): Promise<HealthCheckResult> => {
      const url = s.internalUrl ?? s.url;
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeout);
        return { id: s.id, up: res.ok || res.status < 500, latencyMs: Date.now() - start };
      } catch {
        return { id: s.id, up: false, latencyMs: null };
      }
    })
  );

  return NextResponse.json(results);
}
