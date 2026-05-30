'use client';

import { useEffect, useState } from 'react';
import { services, categories } from '@/lib/services';
import { ServiceTile } from './ServiceTile';
import { ContainerStatus, HealthCheckResult } from '@/types';

interface StatusMap {
  docker: Record<string, ContainerStatus>;
  health: Record<string, HealthCheckResult>;
}

export function ServiceGrid() {
  const [statusMap, setStatusMap] = useState<StatusMap>({ docker: {}, health: {} });

  useEffect(() => {
    let cancelled = false;

    async function fetchStatuses() {
      const [dockerRes, healthRes] = await Promise.allSettled([
        fetch('/api/docker-status').then((r) => r.json()),
        fetch('/api/health-check').then((r) => r.json()),
      ]);

      const docker: Record<string, ContainerStatus> = {};
      if (dockerRes.status === 'fulfilled') {
        for (const s of dockerRes.value.statuses ?? []) {
          docker[s.name] = s;
        }
      }

      const health: Record<string, HealthCheckResult> = {};
      if (healthRes.status === 'fulfilled') {
        for (const h of (healthRes.value as HealthCheckResult[])) {
          health[h.id] = h;
        }
      }

      if (!cancelled) setStatusMap({ docker, health });
    }

    void fetchStatuses();
    const id = setInterval(() => { void fetchStatuses(); }, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const group = services.filter((s) => s.category === cat);
        return (
          <section key={cat}>
            <h2 className="mb-3 text-xs uppercase tracking-widest opacity-60">{cat}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {group.map((s) => (
                <ServiceTile
                  key={s.id}
                  service={s}
                  containerState={statusMap.docker[s.id]?.state ?? null}
                  httpUp={statusMap.health[s.id]?.up ?? null}
                  latencyMs={statusMap.health[s.id]?.latencyMs ?? null}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
