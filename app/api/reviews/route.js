import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Review from '@/models/Review';
import Booking from '@/models/Booking';
import Equipment from '@/models/Equipment';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const equipmentId = searchParams.get('equipmentId');
    const reviewType = searchParams.get('reviewType') || 'equipment';

    const query = { reviewType };
    if (equipmentId) query.equipment = equipmentId;

    const reviews = await Review.find(query)
      .populate('reviewer', 'name')
      .populate('equipment', 'title')
      .sort({ createdAt: -1 });

    return NextResponse.json({ reviews });
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

    const { bookingId, equipmentId, rating, comment, reviewType = 'equipment' } = await request.json();

    if (!bookingId || !rating) {
      return NextResponse.json({ error: 'bookingId and rating are required' }, { status: 400 });
    }
    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    if (booking.status !== 'completed') {
      return NextResponse.json({ error: 'Can only review completed bookings' }, { status: 400 });
    }

    if (reviewType === 'equipment') {
      if (booking.borrower.toString() !== user.userId) {
        return NextResponse.json({ error: 'Only the borrower can review equipment' }, { status: 403 });
      }
    } else if (reviewType === 'borrower') {
      if (booking.owner.toString() !== user.userId) {
        return NextResponse.json({ error: 'Only the owner can review the borrower' }, { status: 403 });
      }
    }

    const existing = await Review.findOne({ booking: bookingId, reviewType });
    if (existing) {
      return NextResponse.json({ error: 'You already submitted this review' }, { status: 409 });
    }

    const review = await Review.create({
      booking: bookingId,
      equipment: equipmentId || booking.equipment,
      reviewer: user.userId,
      owner: booking.owner,
      rating,
      comment,
      reviewType,
    });

    if (reviewType === 'equipment' && equipmentId) {
      const allReviews = await Review.find({ equipment: equipmentId, reviewType: 'equipment' });
      const avg = allReviews.reduce((s, r) => s + r.rating, 0) / allReviews.length;
      await Equipment.findByIdAndUpdate(equipmentId, {
        rating: Math.round(avg * 10) / 10,
        totalReviews: allReviews.length,
      });
    }

    if (reviewType === 'borrower') {
      const borrowerBookings = await Booking.find({ borrower: booking.borrower }).select('_id');
      const borrowerReviews = await Review.find({
        booking: { $in: borrowerBookings.map(b => b._id) },
        reviewType: 'borrower',
      });
      if (borrowerReviews.length > 0) {
        const avg = borrowerReviews.reduce((s, r) => s + r.rating, 0) / borrowerReviews.length;
        await User.findByIdAndUpdate(booking.borrower, {
          rating: Math.round(avg * 10) / 10,
          totalReviews: borrowerReviews.length,
        });
      }
    }

    await review.populate('reviewer', 'name');
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
