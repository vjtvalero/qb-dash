export type ServiceCategory = 'Media' | 'Automation' | 'Infrastructure';

export interface Service {
  id: string;
  name: string;
  url: string;
  category: ServiceCategory;
  healthCheck: boolean;
  internalUrl?: string;
}

export type ContainerState = 'running' | 'exited' | 'paused' | 'restarting' | 'dead' | 'created' | 'unknown';

export interface ContainerStatus {
  name: string;
  state: ContainerState;
}

export type DotStatus = 'green' | 'yellow' | 'red' | 'gray';

export interface ServiceStatus {
  id: string;
  containerState: ContainerState | null;
  httpUp: boolean | null;
  latencyMs: number | null;
}

export interface Torrent {
  hash: string;
  name: string;
  progress: number;
  dlspeed: number;
  upspeed: number;
  size: number;
  state: string;
  eta: number;
  num_seeds: number;
  num_leechs: number;
}

export interface HealthCheckResult {
  id: string;
  up: boolean;
  latencyMs: number | null;
}

export interface ContainerInfo {
  id: string;
  name: string;
  state: ContainerState;
  status: string;
  image: string;
  cpuPercent: number | null;
  memUsed: number | null;
  memLimit: number | null;
}

export interface DockerStatusResponse {
  statuses: ContainerStatus[];
}

export interface TorrentsResponse {
  torrents: Torrent[];
}
