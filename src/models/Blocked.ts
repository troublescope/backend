import mongoose, { Schema, Document } from 'mongoose';

export interface IBlocked extends Document {
  telegram_id: number;
  reason: string;
  created_at: Date;
}

const BlockedSchema: Schema = new Schema({
  telegram_id: { type: Number, required: true, unique: true },
  reason: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model<IBlocked>('Blocked', BlockedSchema);