import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Equipment from '@/models/Equipment';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const equipment = await Equipment.find({ owner: user.userId }).sort({ createdAt: -1 });
    return NextResponse.json({ equipment });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
