'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import type { DiskInfo, FolderGroup } from '@/lib/storage';

function fmtBytes(bytes: number): string {
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(0)} MB`;
  if (bytes < 1024 ** 4) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  return `${(bytes / 1024 ** 4).toFixed(2)} TB`;
}

function diskStateLabel(pct: number): { label: string; color: string } {
  if (pct >= 90) return { label: 'Critical', color: 'text-red-500' };
  if (pct >= 75) return { label: 'Warning', color: 'text-yellow-500' };
  return { label: 'Healthy', color: 'text-green-500' };
}

export function StoragePanel() {
  const [disks, setDisks] = useState<DiskInfo[]>([]);
  const [folderGroups, setFolderGroups] = useState<FolderGroup[]>([]);

  useEffect(() => {
    const fetchStorage = () =>
      fetch('/api/storage')
        .then((r) => r.json())
        .then((d) => {
          setDisks(d.disks ?? []);
          setFolderGroups(d.folderGroups ?? []);
        })
        .catch(() => {});

    fetchStorage();
    const id = setInterval(fetchStorage, 60_000);
    return () => clearInterval(id);
  }, []);

  if (disks.length === 0 && folderGroups.length === 0) {
    return <p className="text-sm opacity-60">Loading storage info…</p>;
  }

  return (
    <div className="space-y-4">
      {/* Disk state cards */}
      <div className="flex gap-3 flex-wrap">
        {disks.map((d) => {
          const state = diskStateLabel(d.usedPercent);
          return (
            <Card key={d.mountPath} className="min-w-[180px]">
              <CardContent className="p-4">
                <p className="text-xs opacity-60 mb-1">
                  {d.label} <span className="font-mono">{d.mountPath}</span>
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black">{d.usedPercent}%</span>
                  <span className={`text-xs font-bold ${state.color}`}>{state.label}</span>
                </div>
                <p className="text-xs opacity-60 mt-1">
                  {fmtBytes(d.used)} / {fmtBytes(d.total)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Top folders — Apps & Docker first, then Media Drive */}
      {folderGroups.map((group) => (
        <Card key={group.label}>
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-widest opacity-60 mb-3">{group.label}</p>
            <div className="space-y-2">
              {group.entries.map((f, i) => (
                <div key={f.path} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs opacity-40 w-5 text-right shrink-0">{i + 1}</span>
                    <span className="text-sm font-mono truncate" title={f.path}>{f.path}</span>
                  </div>
                  <span className="text-sm font-bold shrink-0">{fmtBytes(f.bytes)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
