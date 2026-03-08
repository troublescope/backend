import mongoose, { Schema, Document } from 'mongoose';

export interface ISeriesLimit extends Document {
  series_id: string;
  total_episodes: number;
  free_limit: number;
  created_at: Date;
}

const SeriesLimitSchema: Schema = new Schema({
  series_id: { type: String, required: true, unique: true },
  total_episodes: { type: Number, required: true },
  free_limit: { type: Number, required: true },
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model<ISeriesLimit>('SeriesLimit', SeriesLimitSchema);