import mongoose, { Schema, Document } from 'mongoose';

export interface IDrama extends Document {
  id: string;
  lang: string;
  title: string;
  cover: string;
  chapters: number;
  description: string;
  playCount: string;
  tags: string[];
  rank?: string;
  last_updated: Date;
}

const DramaSchema: Schema = new Schema({
  id: { type: String, required: true, index: true },
  lang: { type: String, required: true, default: 'in', index: true },
  title: { type: String, required: true },
  cover: { type: String },
  chapters: { type: Number },
  description: { type: String },
  playCount: { type: String },
  tags: [{ type: String }],
  rank: { type: String },
  last_updated: { type: Date, default: Date.now }
});

DramaSchema.index({ id: 1, lang: 1 }, { unique: true });

export default mongoose.model<IDrama>('Drama', DramaSchema);
