import mongoose from 'mongoose';
import { secrets } from './config';

class DatabaseController{
  
  private static instance: DatabaseController;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseController {
    if (!DatabaseController.instance) {
      DatabaseController.instance = new DatabaseController();
    }
    return DatabaseController.instance;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      console.debug('Already connected to MongoDB');
      return;
    }

    try {
      const mongoURI = secrets.MONGO_URI;

      if (!mongoURI) {
        throw new Error('MongoDB URI is not defined in the environment variables');
      }

      mongoose.set('strictQuery', true);
      await mongoose.connect(mongoURI);

      this.isConnected = true;
      console.debug('Connected to MongoDB');
    } catch (error) {
      this.isConnected = false;
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.debug('Not connected to MongoDB');
      return;
    }

    try {
      await mongoose.disconnect();
      this.isConnected = false;
      console.debug('Disconnected from MongoDB');
    } catch (error) {
      console.error('Failed to disconnect from MongoDB:', error);
      throw error;
    }
  }

  public isConnectedToDB(): boolean {
    return this.isConnected;
  }
}

export const connectToDB = async (): Promise<void> => {
  const dbConnection = DatabaseController.getInstance();
  await dbConnection.connect();
};

export const disconnectFromDB = async (): Promise<void> => {
  const dbConnection = DatabaseController.getInstance();
  await dbConnection.disconnect();
};

export const isConnectedToDB = (): boolean => {
  const dbConnection = DatabaseController.getInstance();
  return dbConnection.isConnectedToDB();
};