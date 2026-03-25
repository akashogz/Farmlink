import mongoose from 'mongoose';

const EquipmentSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  category: {
    type: String,
    required: true,
    enum: ['tractor', 'harvester', 'irrigation', 'plowing', 'seeding', 'spraying', 'other'],
  },
  description: { type: String, required: true },
  pricePerDay: { type: Number, required: true },
  depositAmount: { type: Number, default: 0 },
  location: { type: String, required: true },
  coordinates: {
    lat: { type: Number },
    lng: { type: Number },
  },
  specifications: { type: mongoose.Schema.Types.Mixed, default: {} },
  addOns: [{
    name: { type: String, required: true },
    pricePerDay: { type: Number, required: true, default: 0 },
  }],
  images: [{ type: String }],
  status: {
    type: String,
    enum: ['available', 'in_use', 'inspection', 'maintenance'],
    default: 'available',
  },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Equipment || mongoose.model('Equipment', EquipmentSchema);
