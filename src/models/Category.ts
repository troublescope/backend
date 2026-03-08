import mongoose, { Schema, Document } from 'mongoose';

export interface ICategory extends Document {
  id: number;
  name: string;
  poster: string;
  count: number;
  last_updated: Date;
}

const CategorySchema: Schema = new Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  poster: { type: String },
  count: { type: Number },
  last_updated: { type: Date, default: Date.now }
});

export default mongoose.model<ICategory>('Category', CategorySchema);
