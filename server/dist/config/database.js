"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
exports.isMongoConnected = isMongoConnected;
exports.disconnectDatabase = disconnectDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const environment_js_1 = require("./environment.js");
const state = {
    isConnected: false,
    isConnecting: false,
    lastError: null,
    connectionUri: '',
};
async function connectToDatabase(customUri) {
    if (state.isConnected && mongoose_1.default.connection.readyState === 1) {
        return mongoose_1.default;
    }
    if (state.isConnecting) {
        // Wait for in-flight connection attempt
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (state.isConnected) {
                    clearInterval(check);
                    resolve(mongoose_1.default);
                }
                else if (!state.isConnecting) {
                    clearInterval(check);
                    resolve(null);
                }
            }, 100);
        });
    }
    state.isConnecting = true;
    const targetUri = customUri || environment_js_1.env.mongodbUri;
    state.connectionUri = targetUri;
    const connectionOptions = {
        dbName: environment_js_1.env.mongodbDbName,
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
        await mongoose_1.default.connect(targetUri, connectionOptions);
        state.isConnected = true;
        state.isConnecting = false;
        state.lastError = null;
        console.log(`[MongoDB] Successfully connected to database: ${environment_js_1.env.mongodbDbName}`);
        return mongoose_1.default;
    }
    catch (err) {
        state.isConnected = false;
        state.isConnecting = false;
        state.lastError = err;
        console.warn(`[MongoDB] Connection warning (${err.message}). System operating with hybrid fallback resilience.`);
        return null;
    }
}
function isMongoConnected() {
    return state.isConnected && mongoose_1.default.connection.readyState === 1;
}
async function disconnectDatabase() {
    if (mongoose_1.default.connection.readyState !== 0) {
        await mongoose_1.default.disconnect();
        state.isConnected = false;
        console.log('[MongoDB] Connection gracefully terminated.');
    }
}
// Global Mongoose Event Hooks
mongoose_1.default.connection.on('connected', () => {
    state.isConnected = true;
    console.log('[MongoDB Event] Connection established.');
});
mongoose_1.default.connection.on('error', (err) => {
    state.isConnected = false;
    state.lastError = err;
    console.error('[MongoDB Event] Connection error occurred:', err.message);
});
mongoose_1.default.connection.on('disconnected', () => {
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
