import mongoose from 'mongoose';
import { config } from '../config/env';

export const connectDB = async () => {
  try {
    // Attempting to connect, if it fails after 2 seconds, we will proceed with a warning for documentation testing
    console.log(`Connecting to MongoDB at: ${config.mongoUri}`);
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log('MongoDB connected');
  } catch (error) {
    console.warn('MongoDB connection failed. Proceeding in documentation mode (DB logic may fail).');
    console.warn('Error:', (error as Error).message);
  }
};