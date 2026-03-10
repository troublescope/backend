import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tmaback';

async function testConnection() {
  console.log(`Testing connection to: ${mongoUri.replace(/:([^:@]+)@/, ':****@')}`);
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('✅ MongoDB connected successfully!');
    await mongoose.connection.close();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ MongoDB connection failed!');
    console.error('Error Name:', error.name);
    console.error('Error Message:', error.message);
    process.exit(1);
  }
}

testConnection();
