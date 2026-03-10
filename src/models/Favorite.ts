import mongoose, { Schema, Document } from 'mongoose';

export interface IFavorite extends Document {
  user_id: string;
  content_id: string;
  created_at: Date;
}

const FavoriteSchema: Schema = new Schema({
  user_id: { type: String, required: true, index: true },
  content_id: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

FavoriteSchema.index({ user_id: 1, content_id: 1 }, { unique: true });

export default mongoose.model<IFavorite>('Favorite', FavoriteSchema);
