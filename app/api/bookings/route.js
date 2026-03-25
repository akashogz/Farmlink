import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Booking from '@/models/Booking';
import Equipment from '@/models/Equipment';
import { getUserFromRequest } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(request) {
  try {
    await connectDB();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || 'borrower';

    const query = role === 'owner'
      ? { owner: user.userId }
      : { borrower: user.userId };

    const bookings = await Booking.find(query)
      .populate('equipment', 'title category location pricePerDay images')
      .populate('borrower', 'name email phone')
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });

    return NextResponse.json({ bookings });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { equipmentId, startDate, endDate, notes, selectedAddOns } = await request.json();

    if (!equipmentId || !startDate || !endDate) {
      return NextResponse.json({ error: 'equipmentId, startDate, endDate are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    if (start < new Date()) return NextResponse.json({ error: 'Start date cannot be in the past' }, { status: 400 });

    const equipment = await Equipment.findById(equipmentId);
    if (!equipment) return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });

    if (['maintenance', 'inspection'].includes(equipment.status)) {
      return NextResponse.json({ error: 'Equipment is currently unavailable for booking' }, { status: 409 });
    }

    if (equipment.owner.toString() === user.userId) {
      return NextResponse.json({ error: 'You cannot book your own equipment' }, { status: 400 });
    }

    const conflict = await Booking.findOne({
      equipment: equipmentId,
      status: { $in: ['payment_pending', 'confirmed', 'in_progress'] },
      $or: [{ startDate: { $lt: end }, endDate: { $gt: start } }],
    });

    if (conflict) {
      return NextResponse.json({ error: 'Equipment is already booked for the selected dates' }, { status: 409 });
    }

    const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));

    // Validate selected add-ons against equipment's actual addOns list
    const validAddOns = (selectedAddOns || []).filter(a =>
      equipment.addOns?.some(ea => ea.name === a.name)
    );
    const addOnsTotal = validAddOns.reduce((sum, a) => sum + (a.pricePerDay || 0) * totalDays, 0);
    const totalPrice = totalDays * equipment.pricePerDay + addOnsTotal;

    const qrToken = crypto.randomBytes(16).toString('hex');

    const booking = await Booking.create({
      equipment: equipmentId,
      borrower: user.userId,
      owner: equipment.owner,
      startDate: start,
      endDate: end,
      totalDays,
      totalPrice,
      depositAmount: equipment.depositAmount,
      notes,
      selectedAddOns: validAddOns,
      addOnsTotal,
      status: 'payment_pending',
      paymentStatus: 'unpaid',
      qrToken,
    });

    await booking.populate([
      { path: 'equipment', select: 'title category location pricePerDay' },
      { path: 'owner', select: 'name email phone' },
    ]);

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
