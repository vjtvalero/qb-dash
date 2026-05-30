import { NextResponse } from 'next/server';
import { getTorrents } from '@/lib/qbittorrent';

export async function GET() {
  try {
    const torrents = await getTorrents();
    return NextResponse.json({ torrents });
  } catch (err) {
    console.error('torrents error:', err);
    return NextResponse.json({ torrents: [] }, { status: 500 });
  }
}
