import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request, { params }) {
  try {
    await connectDB();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentMethod } = await request.json();
    const booking = await Booking.findById(params.id)
      .populate('equipment', 'title category location pricePerDay images')
      .populate('borrower', 'name email phone')
      .populate('owner', 'name email phone');

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.borrower._id.toString() !== user.userId)
      return NextResponse.json({ error: 'Only the borrower can pay' }, { status: 403 });
    if (booking.paymentStatus === 'paid')
      return NextResponse.json({ error: 'Already paid' }, { status: 400 });

    booking.paymentStatus = 'paid';
    booking.paymentMethod = paymentMethod || 'upi';
    booking.paymentTransactionId = 'TXN' + Date.now() + Math.random().toString(36).slice(2, 7).toUpperCase();
    booking.paidAt = new Date();
    booking.status = 'confirmed';
    await booking.save();

    return NextResponse.json({ booking });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
