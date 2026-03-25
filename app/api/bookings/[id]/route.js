import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Equipment from '@/models/Equipment';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const booking = await Booking.findById(params.id)
      .populate('equipment', 'title category location pricePerDay images')
      .populate('borrower', 'name email phone')
      .populate('owner', 'name email phone');

    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const isParty =
      booking.borrower._id.toString() === user.userId ||
      booking.owner._id.toString() === user.userId;
    if (!isParty) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({ booking });
  } catch (err) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { status, paymentMethod, qrToken } = body;

    const booking = await Booking.findById(params.id);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });

    const isOwner = booking.owner.toString() === user.userId;
    const isBorrower = booking.borrower.toString() === user.userId;

    // ── Payment confirmation (borrower pays) ──
    if (paymentMethod) {
      if (!isBorrower) return NextResponse.json({ error: 'Only borrower can pay' }, { status: 403 });
      if (booking.paymentStatus === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 });

      // Simulate payment processing
      booking.paymentStatus = 'paid';
      booking.paymentMethod = paymentMethod;
      booking.paymentTransactionId = 'TXN' + Date.now() + Math.random().toString(36).slice(2, 7).toUpperCase();
      booking.paidAt = new Date();
      booking.status = 'confirmed';
      await booking.save();

      await booking.populate([
        { path: 'equipment', select: 'title category location pricePerDay images' },
        { path: 'borrower', select: 'name email phone' },
        { path: 'owner', select: 'name email phone' },
      ]);
      return NextResponse.json({ booking });
    }

    // ── QR scan → mark as delivered / in_progress ──
    if (qrToken !== undefined) {
      if (!isOwner) return NextResponse.json({ error: 'Only owner can scan QR' }, { status: 403 });
      if (booking.qrToken !== qrToken) return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 });
      if (booking.status !== 'confirmed') return NextResponse.json({ error: 'Booking must be confirmed to deliver' }, { status: 400 });

      booking.status = 'in_progress';
      booking.deliveredAt = new Date();
      booking.deliveredBy = user.userId;

      // Mark equipment as in_use while physically delivered
      const equipment = await Equipment.findById(booking.equipment);
      if (equipment) { equipment.status = 'in_use'; await equipment.save(); }

      await booking.save();
      await booking.populate([
        { path: 'equipment', select: 'title category location pricePerDay images' },
        { path: 'borrower', select: 'name email phone' },
        { path: 'owner', select: 'name email phone' },
      ]);
      return NextResponse.json({ booking });
    }

    // ── Standard status transitions ──
    const allowed = {
      payment_pending: ['cancelled'],
      confirmed: ['cancelled'],
      in_progress: ['completed'],
      completed: [],
      cancelled: [],
      pending: ['confirmed', 'cancelled'],
    };

    if (!allowed[booking.status]?.includes(status)) {
      return NextResponse.json({ error: `Cannot transition from ${booking.status} to ${status}` }, { status: 400 });
    }

    if (status === 'completed' && !isOwner) {
      return NextResponse.json({ error: 'Only owner can mark as completed' }, { status: 403 });
    }
    if (status === 'cancelled' && !isOwner && !isBorrower) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    booking.status = status;

    // Relist equipment when booking ends
    const equipment = await Equipment.findById(booking.equipment);
    if (equipment) {
      if (status === 'completed' || status === 'cancelled') {
        equipment.status = 'available';
        await equipment.save();
      }
    }

    if (status === 'cancelled' && booking.paymentStatus === 'paid') {
      booking.paymentStatus = 'refunded';
    }

    await booking.save();

    await booking.populate([
      { path: 'equipment', select: 'title category location pricePerDay images' },
      { path: 'borrower', select: 'name email phone' },
      { path: 'owner', select: 'name email phone' },
    ]);

    return NextResponse.json({ booking });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
