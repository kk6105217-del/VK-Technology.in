import mongoose from 'mongoose';
import { env } from './environment.js';

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  lastError: Error | null;
  connectionUri: string;
}

const state: ConnectionState = {
  isConnected: false,
  isConnecting: false,
  lastError: null,
  connectionUri: '',
};

export async function connectToDatabase(customUri?: string): Promise<typeof mongoose | null> {
  if (state.isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (state.isConnecting) {
    // Wait for in-flight connection attempt
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (state.isConnected) {
          clearInterval(check);
          resolve(mongoose);
        } else if (!state.isConnecting) {
          clearInterval(check);
          resolve(null);
        }
      }, 100);
    });
  }

  state.isConnecting = true;
  const targetUri = customUri || env.mongodbUri;
  state.connectionUri = targetUri;

  const connectionOptions: mongoose.ConnectOptions = {
    dbName: env.mongodbDbName,
    maxPoolSize: 20,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
    autoIndex: true,
  };

  try {
    // Safe masking of credentials for audit logs
    const maskedUri = targetUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:*****@');
    console.log(`[MongoDB] Initiating connection to: ${maskedUri}`);

    await mongoose.connect(targetUri, connectionOptions);

    state.isConnected = true;
    state.isConnecting = false;
    state.lastError = null;
    console.log(`[MongoDB] Successfully connected to database: ${env.mongodbDbName}`);
    return mongoose;
  } catch (err: any) {
    state.isConnected = false;
    state.isConnecting = false;
    state.lastError = err;
    console.warn(`[MongoDB] Connection warning (${err.message}). System operating with hybrid fallback resilience.`);
    return null;
  }
}

export function isMongoConnected(): boolean {
  return state.isConnected && mongoose.connection.readyState === 1;
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    state.isConnected = false;
    console.log('[MongoDB] Connection gracefully terminated.');
  }
}

// Global Mongoose Event Hooks
mongoose.connection.on('connected', () => {
  state.isConnected = true;
  console.log('[MongoDB Event] Connection established.');
});

mongoose.connection.on('error', (err) => {
  state.isConnected = false;
  state.lastError = err;
  console.error('[MongoDB Event] Connection error occurred:', err.message);
});

mongoose.connection.on('disconnected', () => {
  state.isConnected = false;
  console.warn('[MongoDB Event] Connection disconnected. Attempting auto-recovery.');
});

process.on('SIGINT', async () => {
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});
