export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { getDiskInfo, getTopFolderGroups } from '@/lib/storage';

export async function GET() {
  try {
    const [disks, folderGroups] = await Promise.all([getDiskInfo(), getTopFolderGroups()]);
    return NextResponse.json({ disks, folderGroups });
  } catch (err) {
    console.error('storage error:', err);
    return NextResponse.json({ disks: [], folderGroups: [] }, { status: 500 });
  }
}
