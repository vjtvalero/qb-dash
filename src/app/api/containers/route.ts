export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getContainers } from '@/lib/docker';

export async function GET() {
  try {
    const containers = await getContainers();
    return NextResponse.json({ containers });
  } catch (err) {
    console.error('containers error:', err);
    return NextResponse.json({ containers: [] }, { status: 500 });
  }
}
