import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscription extends Document {
  user_id: mongoose.Types.ObjectId;
  plan: 'free' | 'vip';
  status: 'active' | 'inactive' | 'expired';
  started_at: Date;
  expires_at?: Date;
}

const SubscriptionSchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  plan: { type: String, enum: ['free', 'vip'], default: 'free' },
  status: { type: String, enum: ['active', 'inactive', 'expired'], default: 'active' },
  started_at: { type: Date, default: Date.now },
  expires_at: { type: Date }
});

export default mongoose.model<ISubscription>('Subscription', SubscriptionSchema);