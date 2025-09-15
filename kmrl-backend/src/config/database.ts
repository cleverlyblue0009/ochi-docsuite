import { Pool } from 'pg';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { Client as ElasticsearchClient } from 'elasticsearch';
import config from './index';
import logger from '../utils/logger';

// PostgreSQL Connection Pool
export const pgPool = new Pool({
  connectionString: config.database.url,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test PostgreSQL connection
pgPool.on('connect', () => {
  logger.info('Connected to PostgreSQL database');
});

pgPool.on('error', (err) => {
  logger.error('PostgreSQL connection error:', err);
});

// MongoDB Connection
let mongoClient: MongoClient;
let mongoDb: any;

export const connectMongoDB = async () => {
  try {
    mongoClient = new MongoClient(config.database.mongodb);
    await mongoClient.connect();
    mongoDb = mongoClient.db();
    logger.info('Connected to MongoDB database');
    return mongoDb;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

export const getMongoDb = () => {
  if (!mongoDb) {
    throw new Error('MongoDB not connected. Call connectMongoDB() first.');
  }
  return mongoDb;
};

// Redis Connection
export const redisClient = createClient({
  url: config.database.redis,
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Elasticsearch Connection
export const elasticsearchClient = new ElasticsearchClient({
  host: config.database.elasticsearch,
  log: config.nodeEnv === 'development' ? 'trace' : 'error',
});

// Test Elasticsearch connection
export const testElasticsearchConnection = async () => {
  try {
    await elasticsearchClient.ping({ requestTimeout: 3000 });
    logger.info('Connected to Elasticsearch');
  } catch (error) {
    logger.error('Elasticsearch connection error:', error);
  }
};

// Database initialization
export const initializeDatabases = async () => {
  try {
    // Connect to Redis
    await redisClient.connect();
    
    // Connect to MongoDB
    await connectMongoDB();
    
    // Test Elasticsearch
    await testElasticsearchConnection();
    
    logger.info('All databases connected successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

// Graceful shutdown
export const closeDatabases = async () => {
  try {
    await pgPool.end();
    await mongoClient?.close();
    await redisClient.quit();
    logger.info('All database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }
};