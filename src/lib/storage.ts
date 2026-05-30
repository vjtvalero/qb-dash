import { promises as fs } from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export interface DiskInfo {
  label: string;
  mountPath: string;
  total: number;
  used: number;
  free: number;
  usedPercent: number;
}

export interface FolderEntry {
  path: string;
  label: string;
  bytes: number;
}

export interface FolderGroup {
  label: string;
  entries: FolderEntry[];
}

const DISKS: { label: string; hostPath: string; statPath?: string }[] = [
  { label: 'Root', hostPath: '/', statPath: '/home/vncntjms' },
  { label: 'Media HDD', hostPath: '/mnt/hdd' },
];

const SCAN_GROUPS: { label: string; dirs: string[] }[] = [
  {
    label: 'Apps & Docker',
    dirs: ['/home/vncntjms', '/var/lib/docker'],
  },
  {
    label: 'Media Drive',
    dirs: ['/mnt/hdd'],
  },
];

export async function getDiskInfo(): Promise<DiskInfo[]> {
  const results: DiskInfo[] = [];

  for (const disk of DISKS) {
    try {
      const stats = await fs.statfs(`/host${disk.statPath ?? disk.hostPath}`);
      const total = stats.blocks * stats.bsize;
      const free = stats.bfree * stats.bsize;
      const used = total - free;
      results.push({
        label: disk.label,
        mountPath: disk.hostPath,
        total,
        used,
        free,
        usedPercent: total > 0 ? Math.round((used / total) * 100) : 0,
      });
    } catch {
      // disk unavailable — skip
    }
  }

  return results;
}

async function scanDir(dir: string, topN: number): Promise<FolderEntry[]> {
  const children = await fs.readdir(`/host${dir}`);
  const paths = children.map((c) => `/host${dir}/${c}`);
  if (paths.length === 0) return [];

  // BusyBox du: -s (summarize) -k (KB output)
  const { stdout } = await execFileAsync('du', ['-sk', ...paths], { timeout: 10_000 });

  const entries: FolderEntry[] = [];
  for (const line of stdout.trim().split('\n')) {
    const tabIdx = line.indexOf('\t');
    if (tabIdx === -1) continue;
    const kbStr = line.slice(0, tabIdx);
    const fullPath = line.slice(tabIdx + 1);
    const kb = parseInt(kbStr, 10);
    if (isNaN(kb) || !fullPath) continue;

    const hostPath = fullPath.replace(/^\/host/, '') || '/';
    const label = hostPath.split('/').filter(Boolean).pop() ?? hostPath;
    entries.push({ path: hostPath, label, bytes: kb * 1024 });
  }

  return entries.sort((a, b) => b.bytes - a.bytes).slice(0, topN);
}

export async function getTopFolderGroups(topN = 8): Promise<FolderGroup[]> {
  const groups: FolderGroup[] = [];

  for (const group of SCAN_GROUPS) {
    const allEntries: FolderEntry[] = [];

    for (const dir of group.dirs) {
      try {
        const entries = await scanDir(dir, topN);
        allEntries.push(...entries);
      } catch {
        // dir inaccessible — skip
      }
    }

    if (allEntries.length === 0) continue;

    const seen = new Set<string>();
    const deduped = allEntries
      .filter((e) => { if (seen.has(e.path)) return false; seen.add(e.path); return true; })
      .sort((a, b) => b.bytes - a.bytes)
      .slice(0, topN);

    groups.push({ label: group.label, entries: deduped });
  }

  return groups;
}
