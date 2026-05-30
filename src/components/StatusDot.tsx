import { DotStatus } from '@/types';

const colorMap: Record<DotStatus, string> = {
  green:  'bg-green-400',
  yellow: 'bg-yellow-400',
  red:    'bg-red-500',
  gray:   'bg-zinc-500',
};

export function StatusDot({ status }: { status: DotStatus }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${colorMap[status]} ring-1 ring-black`}
      aria-label={status}
    />
  );
}
