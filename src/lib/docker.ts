import http from 'node:http';
import { ContainerInfo, ContainerStatus, ContainerState } from '@/types';

function dockerRequest<T>(path: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const options: http.RequestOptions = {
      socketPath: '/var/run/docker.sock',
      path,
      method: 'GET',
      headers: { Host: 'localhost' },
      timeout: 5000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Failed to parse Docker response')); }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Docker socket timeout')); });
    req.on('error', reject);
    req.end();
  });
}

interface DockerListItem {
  Id: string;
  Names: string[];
  Image: string;
  State: string;
  Status: string;
}

interface DockerStats {
  cpu_stats: {
    cpu_usage: { total_usage: number };
    system_cpu_usage: number;
    online_cpus?: number;
  };
  precpu_stats: {
    cpu_usage: { total_usage: number };
    system_cpu_usage: number;
  };
  memory_stats: {
    usage: number;
    limit: number;
    stats?: { cache?: number; inactive_file?: number };
  };
}

function shortImage(image: string): string {
  return (image.split(':')[0].split('/').pop()) ?? image;
}

export async function getContainers(): Promise<ContainerInfo[]> {
  const list = await dockerRequest<DockerListItem[]>('/containers/json?all=1');

  const containers = await Promise.all(
    list.map(async (c): Promise<ContainerInfo> => {
      let cpuPercent: number | null = null;
      let memUsed: number | null = null;
      let memLimit: number | null = null;

      if (c.State === 'running') {
        try {
          const s = await dockerRequest<DockerStats>(
            `/containers/${c.Id}/stats?stream=false`
          );
          const cpuDelta = s.cpu_stats.cpu_usage.total_usage - s.precpu_stats.cpu_usage.total_usage;
          const sysDelta = s.cpu_stats.system_cpu_usage - s.precpu_stats.system_cpu_usage;
          const numCpus = s.cpu_stats.online_cpus ?? 1;
          if (sysDelta > 0) cpuPercent = (cpuDelta / sysDelta) * numCpus * 100;

          const cache = s.memory_stats.stats?.inactive_file ?? s.memory_stats.stats?.cache ?? 0;
          memUsed = s.memory_stats.usage - cache;
          memLimit = s.memory_stats.limit;
        } catch {
          // stats unavailable for this container
        }
      }

      return {
        id: c.Id,
        name: c.Names[0]?.replace(/^\//, '') ?? 'unknown',
        state: (c.State as ContainerState) ?? 'unknown',
        status: c.Status,
        image: shortImage(c.Image),
        cpuPercent,
        memUsed,
        memLimit,
      };
    })
  );

  return containers.sort((a, b) => {
    if (a.state === 'running' && b.state !== 'running') return -1;
    if (a.state !== 'running' && b.state === 'running') return 1;
    return a.name.localeCompare(b.name);
  });
}

export async function getAllContainerStatuses(): Promise<ContainerStatus[]> {
  const containers = await dockerRequest<Array<{ Names: string[]; State: string }>>('/containers/json?all=1');
  return containers.map((c) => ({
    name: c.Names[0]?.replace(/^\//, '') ?? 'unknown',
    state: (c.State as ContainerState) ?? 'unknown',
  }));
}
