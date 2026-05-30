'use client';

import { useEffect, useState } from 'react';
import { StatusDot } from '@/components/StatusDot';
import type { ContainerInfo, ContainerState, DotStatus } from '@/types';

function stateToDot(state: ContainerState): DotStatus {
  if (state === 'running') return 'green';
  if (state === 'restarting' || state === 'paused') return 'yellow';
  return 'gray';
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

export function DockerPanel() {
  const [containers, setContainers] = useState<ContainerInfo[]>([]);

  useEffect(() => {
    const load = () =>
      fetch('/api/containers')
        .then((r) => r.json())
        .then((d) => setContainers(d.containers ?? []))
        .catch(() => {});

    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  if (containers.length === 0) {
    return <p className="text-sm opacity-60">No containers found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-widest opacity-40">
            <th className="pb-2 pr-4 text-left font-normal">Container</th>
            <th className="pb-2 pr-4 text-left font-normal">Image</th>
            <th className="pb-2 pr-4 text-left font-normal">Uptime</th>
            <th className="pb-2 pr-4 text-right font-normal">CPU</th>
            <th className="pb-2 text-right font-normal">RAM</th>
          </tr>
        </thead>
        <tbody>
          {containers.map((c) => (
            <tr
              key={c.id}
              className={`border-b border-white/5 last:border-0 transition-opacity ${c.state !== 'running' ? 'opacity-35' : ''}`}
            >
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <StatusDot status={stateToDot(c.state)} />
                  <span className="font-medium">{c.name}</span>
                </div>
              </td>
              <td className="py-2.5 pr-4 font-mono text-xs opacity-50">{c.image}</td>
              <td className="py-2.5 pr-4 opacity-60">{c.status}</td>
              <td className="py-2.5 pr-4 text-right tabular-nums">
                {c.cpuPercent !== null ? `${c.cpuPercent.toFixed(1)}%` : '—'}
              </td>
              <td className="py-2.5 text-right tabular-nums opacity-80">
                {c.memUsed !== null && c.memLimit !== null
                  ? `${fmtBytes(c.memUsed)} / ${fmtBytes(c.memLimit)}`
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
