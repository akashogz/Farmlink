import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Equipment from '@/models/Equipment';
import User from '@/models/User';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const lat = parseFloat(searchParams.get('lat'));
    const lng = parseFloat(searchParams.get('lng'));

    const query = { status: { $in: ['available', 'in_use'] } };
    if (category && category !== 'all') query.category = category;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }

    const equipment = await Equipment.find(query)
      .populate('owner', 'name location rating')
      .sort({ createdAt: -1 });

    // If user coords provided, compute distance and sort by proximity
    if (!isNaN(lat) && !isNaN(lng)) {
      const withDistance = equipment.map(item => {
        const obj = item.toObject();
        if (item.coordinates?.lat && item.coordinates?.lng) {
          obj.distanceKm = haversineKm(lat, lng, item.coordinates.lat, item.coordinates.lng);
        } else {
          obj.distanceKm = null;
        }
        return obj;
      });
      // Items with known distance first (sorted asc), unknown at end
      withDistance.sort((a, b) => {
        if (a.distanceKm === null && b.distanceKm === null) return 0;
        if (a.distanceKm === null) return 1;
        if (b.distanceKm === null) return -1;
        return a.distanceKm - b.distanceKm;
      });
      return NextResponse.json({ equipment: withDistance });
    }

    return NextResponse.json({ equipment });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function POST(request) {
  try {
    await connectDB();
    const user = getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { title, category, description, pricePerDay, depositAmount, location, specifications, images, coordinates, addOns } = body;

    if (!title || !category || !description || !pricePerDay || !location) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const equipment = await Equipment.create({
      title, category, description, pricePerDay,
      depositAmount: depositAmount || 0,
      location,
      specifications: specifications || {},
      addOns: addOns || [],
      images: images || [],
      coordinates: coordinates || null,
      owner: user.userId,
    });

    await equipment.populate('owner', 'name location rating');
    return NextResponse.json({ equipment }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
