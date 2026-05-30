import { Card, CardContent } from '@/components/ui/card';
import { StatusDot } from './StatusDot';
import { Service, ContainerState, DotStatus } from '@/types';

function resolveDotStatus(containerState: ContainerState | null | undefined, httpUp: boolean | null | undefined): DotStatus {
  if (containerState === null || containerState === undefined) return 'gray';
  if (containerState !== 'running') return 'red';
  if (httpUp === null || httpUp === undefined) return 'yellow';
  return httpUp ? 'green' : 'yellow';
}

interface ServiceTileProps {
  service: Service;
  containerState?: ContainerState | null;
  httpUp?: boolean | null;
  latencyMs?: number | null;
}

export function ServiceTile({ service, containerState, httpUp, latencyMs }: ServiceTileProps) {
  const dot = resolveDotStatus(containerState, service.healthCheck ? httpUp : undefined);

  return (
    <a href={service.url} target="_blank" rel="noopener noreferrer" className="block">
      <Card className="cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-none hover:translate-x-boxShadowX hover:translate-y-boxShadowY">
        <CardContent className="flex items-center gap-3 p-4">
          <StatusDot status={dot} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold text-sm">{service.name}</p>
            {latencyMs !== null && latencyMs !== undefined && (
              <p className="text-xs opacity-60">{latencyMs}ms</p>
            )}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}
