import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, trim: true, maxlength: 500 },
  reviewType: { type: String, enum: ['equipment', 'borrower'], default: 'equipment' },
}, { timestamps: true });

ReviewSchema.index({ booking: 1, reviewType: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model('Review', ReviewSchema);
