import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Equipment from '@/models/Equipment';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const equipment = await Equipment.findById(params.id).populate('owner', 'name location rating phone');
    if (!equipment) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    return NextResponse.json({ equipment });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const equipment = await Equipment.findById(params.id);
    if (!equipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (equipment.owner.toString() !== user.userId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    Object.assign(equipment, body);
    await equipment.save();

    return NextResponse.json({ equipment });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const equipment = await Equipment.findById(params.id);
    if (!equipment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (equipment.owner.toString() !== user.userId)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await equipment.deleteOne();
    return NextResponse.json({ message: 'Deleted successfully' });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
