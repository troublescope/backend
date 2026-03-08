import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  user_id: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  provider: string;
  created_at: Date;
}

const PaymentSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true, default: 'USD' },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  provider: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model<IPayment>('Payment', PaymentSchema);