import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  photo_url?: string;
  is_premium: boolean;
  plan: 'free' | 'vip';
  created_at: Date;
  last_login: Date;
}

const UserSchema: Schema = new Schema({
  telegram_id: { type: Number, required: true, unique: true },
  username: { type: String },
  first_name: { type: String },
  last_name: { type: String },
  photo_url: { type: String },
  is_premium: { type: Boolean, default: false },
  plan: { type: String, enum: ['free', 'vip'], default: 'free' },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date, default: Date.now }
});

export default mongoose.model<IUser>('User', UserSchema);