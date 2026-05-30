export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getAllContainerStatuses } from '@/lib/docker';

export async function GET() {
  try {
    const statuses = await getAllContainerStatuses();
    return NextResponse.json({ statuses });
  } catch (err) {
    console.error('docker-status error:', err);
    return NextResponse.json({ statuses: [] }, { status: 500 });
  }
}
