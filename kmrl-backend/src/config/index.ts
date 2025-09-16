import dotenv from 'dotenv';
import { Config } from '../types';

// Load environment variables
dotenv.config();

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  database: {
    url: process.env.DATABASE_URL || 'postgresql://kmrl_user:kmrl_password@localhost:5432/kmrl_db',
    mongodb: process.env.MONGODB_URI || 'mongodb://localhost:27017/kmrl-docs',
    redis: process.env.REDIS_URL || 'redis://localhost:6379',
    elasticsearch: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  },
  
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    clientId: process.env.FIREBASE_CLIENT_ID || '',
    authUri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    tokenUri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
    clientCertUrl: process.env.FIREBASE_CLIENT_X509_CERT_URL || '',
  },
  
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  },
  
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || 'kmrl-documents',
    ...(process.env.S3_ENDPOINT && { endpoint: process.env.S3_ENDPOINT }),
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '20971520', 10), // 20MB
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    supportedFormats: (process.env.SUPPORTED_FORMATS || 'pdf,doc,docx,jpg,jpeg,png,xlsx,dwg,dxf').split(','),
  },
  
  ai: {
    pythonServiceUrl: process.env.PYTHON_ML_SERVICE_URL || 'http://localhost:8000',
    ocrConfidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD || '0.9'),
    classificationConfidenceThreshold: parseFloat(process.env.CLASSIFICATION_CONFIDENCE_THRESHOLD || '0.85'),
  },
  
  cors: {
    origins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3001').split(','),
  },
  
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
};

// Validate required environment variables in production
if (config.nodeEnv === 'production') {
  const requiredVars = [
    'DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'GOOGLE_CLIENT_ID',
  ];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Required environment variable ${varName} is not set`);
    }
  }
}

export default config;