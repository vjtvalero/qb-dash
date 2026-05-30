export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getBlockedDomains, setDomainEnabled, addDomain, removeDomain } from '@/lib/dnsblock';

export async function GET() {
  try {
    const domains = await getBlockedDomains();
    return NextResponse.json({ domains });
  } catch (err) {
    console.error('dns-block GET error:', err);
    return NextResponse.json({ domains: [] }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { domain, enabled } = await req.json();
    if (typeof domain !== 'string' || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    await setDomainEnabled(domain, enabled);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('dns-block POST error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { domain } = await req.json();
    if (typeof domain !== 'string' || !domain.trim()) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    await addDomain(domain.trim().toLowerCase());
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('dns-block PUT error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { domain } = await req.json();
    if (typeof domain !== 'string') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }
    await removeDomain(domain);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('dns-block DELETE error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
