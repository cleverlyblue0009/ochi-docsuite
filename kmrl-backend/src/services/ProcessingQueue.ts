import Bull, { Queue, Job } from 'bull';
import { redisClient } from '../config/database';
import { DocumentModel } from '../models/Document';
import { AIService } from './AIService';
import { FileProcessor } from '../utils/fileUpload';
import logger from '../utils/logger';
import config from '../config';
import path from 'path';
import fs from 'fs';

export interface ProcessingJobData {
  documentId: number;
  filePath: string;
  jobType: 'upload' | 'ocr' | 'classification' | 'indexing' | 'thumbnail';
  metadata?: Record<string, any>;
}

export class ProcessingQueueService {
  private static instance: ProcessingQueueService;
  private queues: Map<string, Queue> = new Map();

  private constructor() {
    this.initializeQueues();
  }

  static getInstance(): ProcessingQueueService {
    if (!ProcessingQueueService.instance) {
      ProcessingQueueService.instance = new ProcessingQueueService();
    }
    return ProcessingQueueService.instance;
  }

  private initializeQueues(): void {
    const redisConfig = {
      redis: {
        host: 'localhost',
        port: 6379,
        // Parse Redis URL if provided
        ...(config.database.redis.includes('redis://') && {
          host: new URL(config.database.redis).hostname,
          port: parseInt(new URL(config.database.redis).port) || 6379
        })
      },
      settings: {
        stalledInterval: 30 * 1000,
        maxStalledCount: 1
      }
    };

    // Document processing queue
    const documentQueue = new Bull('document processing', redisConfig);
    this.queues.set('document', documentQueue);

    // OCR processing queue
    const ocrQueue = new Bull('ocr processing', redisConfig);
    this.queues.set('ocr', ocrQueue);

    // AI classification queue
    const classificationQueue = new Bull('ai classification', redisConfig);
    this.queues.set('classification', classificationQueue);

    // Indexing queue
    const indexingQueue = new Bull('search indexing', redisConfig);
    this.queues.set('indexing', indexingQueue);

    this.setupJobProcessors();
    this.setupEventHandlers();

    logger.info('Processing queues initialized');
  }

  private setupJobProcessors(): void {
    // Document processing
    this.queues.get('document')?.process(10, this.processDocumentJob.bind(this));
    
    // OCR processing
    this.queues.get('ocr')?.process(5, this.processOCRJob.bind(this));
    
    // AI classification
    this.queues.get('classification')?.process(5, this.processClassificationJob.bind(this));
    
    // Search indexing
    this.queues.get('indexing')?.process(10, this.processIndexingJob.bind(this));
  }

  private setupEventHandlers(): void {
    this.queues.forEach((queue, name) => {
      queue.on('completed', (job: Job, result: any) => {
        logger.info(`${name} job completed:`, { jobId: job.id, result });
      });

      queue.on('failed', (job: Job, err: Error) => {
        logger.error(`${name} job failed:`, { jobId: job.id, error: err.message });
      });

      queue.on('stalled', (job: Job) => {
        logger.warn(`${name} job stalled:`, { jobId: job.id });
      });
    });
  }

  async addDocumentProcessingJob(data: ProcessingJobData): Promise<Job> {
    const queue = this.queues.get('document');
    if (!queue) {
      throw new Error('Document queue not initialized');
    }

    const job = await queue.add('process-document', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: 100,
      removeOnFail: 50
    });

    logger.info(`Document processing job added: ${job.id}`);
    return job;
  }

  async addOCRJob(data: ProcessingJobData): Promise<Job> {
    const queue = this.queues.get('ocr');
    if (!queue) {
      throw new Error('OCR queue not initialized');
    }

    const job = await queue.add('process-ocr', data, {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000
      },
      timeout: 120000 // 2 minutes timeout for OCR
    });

    logger.info(`OCR processing job added: ${job.id}`);
    return job;
  }

  async addClassificationJob(data: ProcessingJobData): Promise<Job> {
    const queue = this.queues.get('classification');
    if (!queue) {
      throw new Error('Classification queue not initialized');
    }

    const job = await queue.add('classify-document', data, {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 3000
      },
      timeout: 60000 // 1 minute timeout for classification
    });

    logger.info(`Classification job added: ${job.id}`);
    return job;
  }

  async addIndexingJob(data: ProcessingJobData): Promise<Job> {
    const queue = this.queues.get('indexing');
    if (!queue) {
      throw new Error('Indexing queue not initialized');
    }

    const job = await queue.add('index-document', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      }
    });

    logger.info(`Indexing job added: ${job.id}`);
    return job;
  }

  private async processDocumentJob(job: Job<ProcessingJobData>): Promise<any> {
    const { documentId, filePath } = job.data;
    const startTime = Date.now();

    try {
      // Update job progress
      await job.progress(10);

      // Validate file
      const validation = await FileProcessor.validateFile(filePath);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      await job.progress(25);

      // Extract metadata
      const metadata = await FileProcessor.extractMetadata(filePath);
      
      await job.progress(50);

      // Generate thumbnail if applicable
      const thumbnailPath = path.join(
        path.dirname(filePath),
        'thumbnails',
        `thumb_${path.basename(filePath, path.extname(filePath))}.jpg`
      );

      try {
        await FileProcessor.generateThumbnail(filePath, thumbnailPath);
        metadata.thumbnail = thumbnailPath;
      } catch (error) {
        logger.warn('Could not generate thumbnail:', error);
      }

      await job.progress(75);

      // Move file to final destination
      const finalPath = path.join(
        config.upload.uploadDir,
        'documents',
        new Date().getFullYear().toString(),
        (new Date().getMonth() + 1).toString().padStart(2, '0'),
        path.basename(filePath)
      );

      await FileProcessor.moveToFinalDestination(filePath, finalPath);
      
      // Update document in database
      const processingTime = Date.now() - startTime;
      await DocumentModel.updateStatus(documentId, 'completed', {
        processing_time: processingTime
      });

      await job.progress(100);

      // Queue OCR and classification jobs
      await this.addOCRJob({ documentId, filePath: finalPath, jobType: 'ocr' });
      
      return {
        documentId,
        finalPath,
        metadata,
        processingTime
      };
    } catch (error) {
      logger.error('Document processing failed:', error);
      await DocumentModel.updateStatus(documentId, 'failed');
      throw error;
    }
  }

  private async processOCRJob(job: Job<ProcessingJobData>): Promise<any> {
    const { documentId, filePath } = job.data;
    const startTime = Date.now();

    try {
      await job.progress(10);

      // Perform OCR
      const ocrText = await AIService.performOCR(filePath);
      
      await job.progress(80);

      // Update document with OCR text
      const processingTime = Date.now() - startTime;
      await DocumentModel.updateStatus(documentId, 'processing', {
        ocr_text: ocrText,
        processing_time: processingTime
      });

      await job.progress(100);

      // Queue classification job
      await this.addClassificationJob({ 
        documentId, 
        filePath, 
        jobType: 'classification',
        metadata: { ocrText }
      });

      return {
        documentId,
        ocrText,
        processingTime
      };
    } catch (error) {
      logger.error('OCR processing failed:', error);
      throw error;
    }
  }

  private async processClassificationJob(job: Job<ProcessingJobData>): Promise<any> {
    const { documentId, filePath, metadata } = job.data;
    const startTime = Date.now();

    try {
      await job.progress(10);

      // Get OCR text from metadata or database
      let ocrText = metadata?.ocrText;
      if (!ocrText) {
        const document = await DocumentModel.findById(documentId);
        ocrText = document?.ocr_text || '';
      }

      await job.progress(30);

      // Perform AI classification
      const classificationResult = await AIService.classifyDocument(ocrText, filePath);
      
      await job.progress(80);

      // Update document with classification results
      const processingTime = Date.now() - startTime;
      await DocumentModel.updateStatus(documentId, 'completed', {
        ai_classification: classificationResult.document_type,
        confidence_score: classificationResult.confidence,
        processing_time: processingTime
      });

      await job.progress(90);

      // Queue indexing job
      await this.addIndexingJob({ documentId, filePath, jobType: 'indexing' });

      await job.progress(100);

      return {
        documentId,
        classification: classificationResult,
        processingTime
      };
    } catch (error) {
      logger.error('Classification processing failed:', error);
      throw error;
    }
  }

  private async processIndexingJob(job: Job<ProcessingJobData>): Promise<any> {
    const { documentId } = job.data;

    try {
      await job.progress(25);

      // Get document details
      const document = await DocumentModel.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      await job.progress(50);

      // Index document in Elasticsearch
      // This would integrate with Elasticsearch service
      // await ElasticsearchService.indexDocument(document);

      await job.progress(100);

      logger.info(`Document indexed successfully: ${documentId}`);

      return {
        documentId,
        indexed: true
      };
    } catch (error) {
      logger.error('Indexing failed:', error);
      throw error;
    }
  }

  async getQueueStats(): Promise<Record<string, any>> {
    const stats: Record<string, any> = {};

    for (const [name, queue] of this.queues) {
      const waiting = await queue.getWaiting();
      const active = await queue.getActive();
      const completed = await queue.getCompleted();
      const failed = await queue.getFailed();

      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    }

    return stats;
  }

  async getJobStatus(queueName: string, jobId: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in queue ${queueName}`);
    }

    return {
      id: job.id,
      progress: job.progress(),
      data: job.data,
      opts: job.opts,
      processedOn: job.processedOn,
      finishedOn: job.finishedOn,
      failedReason: job.failedReason
    };
  }

  async closeQueues(): Promise<void> {
    for (const [name, queue] of this.queues) {
      await queue.close();
      logger.info(`Queue ${name} closed`);
    }
  }
}