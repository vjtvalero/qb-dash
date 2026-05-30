import fs from 'node:fs/promises';

const CORE_FILE_PATH = process.env.CORE_DNS_CORE_FILE ?? '/Corefile';
const START_MARKER = '    # qb-dash blocklist start';
const END_MARKER = '    # qb-dash blocklist end';
const ENABLED_TEMPLATE_RE = /^\s*template\s+IN\s+A\s+([a-z0-9.-]+)\s*\{/gim;
const DISABLED_DOMAIN_RE = /^\s*#\s*qb-dash disabled-domain:\s*([a-z0-9.-]+)\s*$/gim;

export interface BlockedDomain {
  domain: string;
  enabled: boolean;
}

export async function getBlockedDomains(): Promise<BlockedDomain[]> {
  const corefile = await fs.readFile(CORE_FILE_PATH, 'utf8');
  return parseBlockedDomains(corefile);
}

export async function setDomainEnabled(domain: string, enabled: boolean): Promise<void> {
  const normalized = normalizeDomain(domain);
  const corefile = await fs.readFile(CORE_FILE_PATH, 'utf8');
  const domains = parseBlockedDomains(corefile);
  const existing = domains.find((entry) => entry.domain === normalized);

  if (!existing) throw new Error(`Domain not found: ${normalized}`);
  existing.enabled = enabled;

  await writeCorefile(corefile, domains);
}

export async function addDomain(domain: string): Promise<void> {
  const normalized = normalizeDomain(domain);
  const corefile = await fs.readFile(CORE_FILE_PATH, 'utf8');
  const domains = parseBlockedDomains(corefile);

  if (domains.some((entry) => entry.domain === normalized)) {
    throw new Error(`Domain already exists: ${normalized}`);
  }

  domains.push({ domain: normalized, enabled: true });
  await writeCorefile(corefile, domains);
}

export async function removeDomain(domain: string): Promise<void> {
  const normalized = normalizeDomain(domain);
  const corefile = await fs.readFile(CORE_FILE_PATH, 'utf8');
  const domains = parseBlockedDomains(corefile);

  if (!domains.some((entry) => entry.domain === normalized)) {
    throw new Error(`Domain not found: ${normalized}`);
  }

  await writeCorefile(corefile, domains.filter((entry) => entry.domain !== normalized));
}

function parseBlockedDomains(corefile: string): BlockedDomain[] {
  const section = getManagedSection(corefile);
  const domains = new Map<string, BlockedDomain>();

  for (const match of section.matchAll(ENABLED_TEMPLATE_RE)) {
    const domain = match[1].toLowerCase();
    domains.set(domain, { domain, enabled: true });
  }

  for (const match of section.matchAll(DISABLED_DOMAIN_RE)) {
    const domain = match[1].toLowerCase();
    if (!domains.has(domain)) domains.set(domain, { domain, enabled: false });
  }

  return Array.from(domains.values()).sort((a, b) => a.domain.localeCompare(b.domain));
}

function getManagedSection(corefile: string): string {
  const start = corefile.indexOf(START_MARKER);
  const end = corefile.indexOf(END_MARKER);

  if (start === -1 || end === -1 || end < start) {
    throw new Error('CoreDNS qb-dash blocklist section not found');
  }

  return corefile.slice(start, end + END_MARKER.length);
}

async function writeCorefile(corefile: string, domains: BlockedDomain[]): Promise<void> {
  const nextCorefile = replaceManagedSection(corefile, renderManagedSection(domains));
  await fs.writeFile(CORE_FILE_PATH, `${nextCorefile.trimEnd()}\n`, 'utf8');
}

function replaceManagedSection(corefile: string, section: string): string {
  const start = corefile.indexOf(START_MARKER);
  const end = corefile.indexOf(END_MARKER);

  if (start !== -1 && end !== -1 && end > start) {
    return `${corefile.slice(0, start)}${section}${corefile.slice(end + END_MARKER.length)}`;
  }

  const cacheLine = corefile.search(/^\s*cache\s+/m);
  if (cacheLine === -1) throw new Error('CoreDNS cache line not found; cannot place blocklist section');

  return `${corefile.slice(0, cacheLine)}${section}\n\n${corefile.slice(cacheLine)}`;
}

function renderManagedSection(domains: BlockedDomain[]): string {
  const lines = [START_MARKER];
  const uniqueDomains = new Map<string, BlockedDomain>();

  for (const entry of domains) {
    const domain = normalizeDomain(entry.domain);
    uniqueDomains.set(domain, { domain, enabled: entry.enabled });
  }

  for (const { domain, enabled } of Array.from(uniqueDomains.values()).sort((a, b) => a.domain.localeCompare(b.domain))) {
    if (lines.length > 1) lines.push('');

    if (!enabled) {
      lines.push(`    # qb-dash disabled-domain: ${domain}`);
      continue;
    }

    const escapedDomain = escapeRegExp(domain);
    lines.push(
      `    template IN A ${domain} {`,
      `        match ^([a-z0-9_-]+\\.)*${escapedDomain}\\.$`,
      '        answer "{{ .Name }} 60 IN A 0.0.0.0"',
      '    }',
      '',
      `    template IN AAAA ${domain} {`,
      `        match ^([a-z0-9_-]+\\.)*${escapedDomain}\\.$`,
      '        answer "{{ .Name }} 60 IN AAAA ::"',
      '    }'
    );
  }

  lines.push(END_MARKER);
  return lines.join('\n');
}

function normalizeDomain(value: string): string {
  let domain = value.trim().toLowerCase();

  domain = domain.replace(/^[a-z][a-z0-9+.-]*:\/\//, '');
  domain = domain.split(/[/?#]/, 1)[0];
  domain = domain.replace(/^\*\./, '').replace(/^\.+|\.+$/g, '');

  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) {
    throw new Error(`Invalid domain: ${value}`);
  }

  const labels = domain.split('.');
  if (labels.some((label) => label.length > 63 || label.startsWith('-') || label.endsWith('-'))) {
    throw new Error(`Invalid domain: ${value}`);
  }

  return domain;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
