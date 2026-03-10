import mongoose from 'mongoose';
import { config } from '../config/env';

let connectionPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    }).then(async (connection) => {
      try {
        const dramaCollection = connection.connection.collection('dramas');
        const indexes = await dramaCollection.indexes();
        const legacyIdUnique = indexes.find((index) =>
          index.unique === true &&
          Object.keys(index.key || {}).length === 1 &&
          index.key?.id === 1
        );

        if (legacyIdUnique?.name) {
          await dramaCollection.dropIndex(legacyIdUnique.name);
        }

        await dramaCollection.createIndex(
          { id: 1, lang: 1 },
          { unique: true, name: 'id_1_lang_1' }
        );
      } catch (indexError) {
        console.warn('Drama index migration skipped:', (indexError as Error).message);
      }

      console.log('MongoDB connected');
      return connection;
    }).catch((error) => {
      connectionPromise = null;
      console.warn('MongoDB connection failed. Proceeding in documentation mode (DB logic may fail).');
      console.warn('Error:', (error as Error).message);
      throw error;
    });
  }

  try {
    return await connectionPromise;
  } catch {
    return mongoose;
  }
};
