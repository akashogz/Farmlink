import mongoose from 'mongoose';

const BookingSchema = new mongoose.Schema({
  equipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },
  totalPrice: { type: Number, required: true },
  depositAmount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['pending', 'payment_pending', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'payment_pending',
  },
  notes: { type: String },
  selectedAddOns: [{
    name: { type: String },
    pricePerDay: { type: Number, default: 0 },
  }],
  addOnsTotal: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
  paymentMethod: { type: String },
  paymentTransactionId: { type: String },
  paidAt: { type: Date },
  qrToken: { type: String },
  deliveredAt: { type: Date },
  deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.models.Booking || mongoose.model('Booking', BookingSchema);
