'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Torrent } from '@/types';

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function fmtSpeed(bps: number): string {
  return `${fmtBytes(bps)}/s`;
}

function fmtEta(secs: number): string {
  if (secs <= 0 || secs > 8640000) return '∞';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function stateBadgeVariant(state: string): 'default' | 'neutral' {
  if (['downloading', 'stalledDL', 'metaDL', 'forcedDL'].includes(state)) return 'default';
  return 'neutral';
}

export function TorrentPanel() {
  const [torrents, setTorrents] = useState<Torrent[]>([]);

  useEffect(() => {
    const fetchTorrents = () =>
      fetch('/api/torrents')
        .then((r) => r.json())
        .then((d) => setTorrents(d.torrents ?? []))
        .catch(() => {});

    fetchTorrents();
    const id = setInterval(fetchTorrents, 5_000);
    return () => clearInterval(id);
  }, []);

  if (torrents.length === 0) {
    return (
      <p className="text-sm opacity-60">No active torrents.</p>
    );
  }

  return (
    <div className="space-y-3">
      {torrents.map((t) => (
        <Card key={t.hash}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold truncate flex-1">{t.name}</p>
              <Badge variant={stateBadgeVariant(t.state)} className="shrink-0 text-xs">
                {t.state}
              </Badge>
            </div>
            <Progress value={Math.round(t.progress * 100)} className="h-2" />
            <div className="flex justify-between text-xs opacity-60">
              <span>{Math.round(t.progress * 100)}% · {fmtBytes(t.size)}</span>
              <span>↓ {fmtSpeed(t.dlspeed)} · ↑ {fmtSpeed(t.upspeed)} · ETA {fmtEta(t.eta)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
