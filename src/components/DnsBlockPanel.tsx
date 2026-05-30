'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import type { BlockedDomain } from '@/lib/dnsblock';

const COOLDOWN_MS = 5000;

export function DnsBlockPanel() {
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [newDomain, setNewDomain] = useState('');
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isPending, startTransition] = useTransition();

  function startCooldown() {
    setCooldown(COOLDOWN_MS / 1000);
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1) { clearInterval(cooldownRef.current!); return 0; }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const isLocked = isPending || cooldown > 0;

  async function load() {
    const res = await fetch('/api/dns-block');
    const data = await res.json();
    setDomains(data.domains ?? []);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      const res = await fetch('/api/dns-block');
      const data = await res.json();
      if (!cancelled) setDomains(data.domains ?? []);
    }

    void loadInitial();
    return () => { cancelled = true; };
  }, []);

  function toggle(domain: string, enabled: boolean) {
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/dns-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain, enabled }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to update');
      }
      await load();
      startCooldown();
    });
  }

  function remove(domain: string) {
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/dns-block', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to remove');
      }
      await load();
      startCooldown();
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    setError('');
    startTransition(async () => {
      const res = await fetch('/api/dns-block', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? 'Failed to add');
      } else {
        setNewDomain('');
      }
      await load();
      startCooldown();
    });
  }

  return (
    <div className="space-y-4">
      {domains.length > 0 ? (
        <div className="space-y-1">
          {domains.map(({ domain, enabled }) => (
            <div key={domain} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
              <button
                onClick={() => toggle(domain, !enabled)}
                disabled={isLocked}
                className={`relative h-5 w-9 flex-shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? 'bg-red-500' : 'bg-white/20'}`}
                aria-label={enabled ? 'Unblock' : 'Block'}
              >
                <span
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </button>
              <span className={`flex-1 font-mono text-sm ${enabled ? '' : 'opacity-40'}`}>{domain}</span>
              <span className={`text-xs ${enabled ? 'text-red-400' : 'opacity-30'}`}>
                {enabled ? 'blocked' : 'off'}
              </span>
              <button
                onClick={() => remove(domain)}
                disabled={isLocked}
                className="text-xs opacity-20 hover:opacity-60 disabled:opacity-10 transition-opacity"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm opacity-40">No blocked domains.</p>
      )}

      <form onSubmit={add} className="flex gap-2">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 rounded-lg bg-white/10 px-3 py-1.5 text-sm outline-none placeholder:opacity-30 focus:ring-1 focus:ring-white/30"
        />
        <button
          type="submit"
          disabled={isLocked || !newDomain.trim()}
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:opacity-30 transition-colors"
        >
          Add
        </button>
      </form>

      {isLocked && (
        <div className="flex items-center gap-2 text-xs opacity-40">
          <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {cooldown > 0 ? `Next change in ${cooldown}s` : 'Applying…'}
        </div>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
