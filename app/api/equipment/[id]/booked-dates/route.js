import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const bookings = await Booking.find({
      equipment: params.id,
      status: { $in: ['payment_pending', 'confirmed', 'in_progress'] },
    }).select('startDate endDate status');

    return NextResponse.json({ bookings });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
