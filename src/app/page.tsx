import { ServiceGrid } from '@/components/ServiceGrid';
import { StoragePanel } from '@/components/StoragePanel';
import { TorrentPanel } from '@/components/TorrentPanel';
import { DockerPanel } from '@/components/DockerPanel';
import { DnsBlockPanel } from '@/components/DnsBlockPanel';

export default function Home() {
  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8">
      <header>
        <h1 className="text-3xl font-black tracking-tight">Homelab</h1>
        <p className="text-sm opacity-60">Service status &amp; downloads</p>
      </header>

      <section>
        <ServiceGrid />
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-widest opacity-60">Storage</h2>
        <StoragePanel />
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-widest opacity-60">Torrents</h2>
        <TorrentPanel />
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-widest opacity-60">Containers</h2>
        <DockerPanel />
      </section>

      <section>
        <h2 className="mb-4 text-xs uppercase tracking-widest opacity-60">DNS Block</h2>
        <DnsBlockPanel />
      </section>
    </main>
  );
}
