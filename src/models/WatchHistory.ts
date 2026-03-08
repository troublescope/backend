import mongoose, { Schema, Document } from 'mongoose';

export interface IWatchHistory extends Document {
  user_id: mongoose.Types.ObjectId;
  series_id: string;
  episode: number;
  progress: number;
  watched_at: Date;
}

const WatchHistorySchema: Schema = new Schema({
  user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  series_id: { type: String, required: true },
  episode: { type: Number, required: true },
  progress: { type: Number, required: true, min: 0, max: 100 },
  watched_at: { type: Date, default: Date.now }
});

WatchHistorySchema.index({ user_id: 1, series_id: 1, episode: 1 }, { unique: true });

export default mongoose.model<IWatchHistory>('WatchHistory', WatchHistorySchema);