// Core Type Definitions for KMRL Document Management System

export interface User {
  id: number;
  email: string;
  firebase_uid: string;
  google_id?: string;
  role: 'admin' | 'manager' | 'user';
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  provider: 'google' | 'email';
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at?: Date;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  progress: number;
  team_size: number;
  start_date?: Date;
  end_date?: Date;
  created_at: Date;
  updated_at?: Date;
}

export interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  file_path: string;
  project_id?: number;
  uploaded_by: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ai_classification?: string;
  confidence_score?: number;
  processing_time?: number;
  ocr_text?: string;
  metadata: Record<string, any>;
  created_at: Date;
  processed_at?: Date;
}

export interface ProcessingJob {
  id: number;
  document_id: number;
  job_type: 'upload' | 'ocr' | 'classification' | 'indexing';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error_message?: string;
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
}

export interface DashboardMetrics {
  documentsProcessedToday: number;
  totalDocuments: number;
  aiAccuracy: number;
  avgProcessingTime: number;
  activeProjects: number;
  systemUptime: number;
  processingQueueSize: number;
  storageUsed: number;
}

export interface AIClassificationResult {
  document_type: string;
  confidence: number;
  processing_time: number;
  entities?: {
    dates: string[];
    amounts: string[];
    project_codes: string[];
  };
  similar_documents?: string[];
}

export interface SearchQuery {
  query: string;
  filters?: {
    document_type?: string;
    project_id?: number;
    date_range?: {
      start: Date;
      end: Date;
    };
    confidence_min?: number;
  };
  sort?: 'relevance' | 'date' | 'confidence';
  page?: number;
  limit?: number;
}

export interface SearchResult {
  documents: Document[];
  total: number;
  page: number;
  limit: number;
  processing_time: number;
}

export interface FileUploadRequest {
  files: Express.Multer.File[];
  project_id?: number;
  metadata?: Record<string, any>;
}

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface WebSocketEvent {
  event: string;
  data: any;
  timestamp: string;
  user_id?: number;
}

// Express Request Extensions
declare global {
  namespace Express {
    interface Request {
      user?: User;
      files?: Express.Multer.File[];
    }
  }
}

// Environment Configuration
export interface Config {
  port: number;
  nodeEnv: string;
  database: {
    url: string;
    mongodb: string;
    redis: string;
    elasticsearch: string;
  };
  firebase: {
    projectId: string;
    privateKeyId: string;
    privateKey: string;
    clientEmail: string;
    clientId: string;
    authUri: string;
    tokenUri: string;
    clientCertUrl: string;
  };
  google: {
    clientId: string;
    clientSecret: string;
  };
  aws: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    s3Bucket: string;
    endpoint?: string;
  };
  upload: {
    maxFileSize: number;
    uploadDir: string;
    supportedFormats: string[];
  };
  ai: {
    pythonServiceUrl: string;
    ocrConfidenceThreshold: number;
    classificationConfidenceThreshold: number;
  };
  cors: {
    origins: string[];
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
}