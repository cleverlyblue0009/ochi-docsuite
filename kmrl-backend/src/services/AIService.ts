import axios from 'axios';
import config from '../config';
import logger from '../utils/logger';
import { AIClassificationResult } from '../types';
import * as Tesseract from 'tesseract.js';
import path from 'path';
import fs from 'fs';

export class AIService {
  private static instance: AIService;

  private constructor() {}

  static getInstance(): AIService {
    if (!AIService.instance) {
      AIService.instance = new AIService();
    }
    return AIService.instance;
  }

  /**
   * Perform OCR on a document file
   */
  static async performOCR(filePath: string): Promise<string> {
    try {
      logger.info(`Starting OCR for file: ${filePath}`);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      // Get file extension to determine processing method
      const ext = path.extname(filePath).toLowerCase();
      
      if (['.jpg', '.jpeg', '.png', '.bmp', '.tiff'].includes(ext)) {
        // Use Tesseract.js for image files
        const result = await Tesseract.recognize(filePath, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              logger.debug(`OCR progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });
        
        const confidence = result.data.confidence;
        if (confidence < config.ai.ocrConfidenceThreshold * 100) {
          logger.warn(`OCR confidence (${confidence}%) below threshold`);
        }
        
        return result.data.text;
      } else if (ext === '.pdf') {
        // For PDF files, try to use external Python service or fallback
        try {
          return await this.performOCRViaPythonService(filePath);
        } catch (error) {
          logger.warn('Python OCR service failed, using fallback method');
          // Fallback to basic PDF text extraction would go here
          return '';
        }
      } else {
        throw new Error(`Unsupported file type for OCR: ${ext}`);
      }
    } catch (error) {
      logger.error('OCR processing failed:', error);
      throw error;
    }
  }

  /**
   * Classify document using AI service
   */
  static async classifyDocument(ocrText: string, filePath: string): Promise<AIClassificationResult> {
    try {
      logger.info(`Starting classification for document: ${path.basename(filePath)}`);
      
      // Try to use external Python ML service
      try {
        return await this.classifyViaPythonService(ocrText, filePath);
      } catch (error) {
        logger.warn('Python classification service failed, using fallback');
        return this.fallbackClassification(ocrText, filePath);
      }
    } catch (error) {
      logger.error('Document classification failed:', error);
      throw error;
    }
  }

  /**
   * Perform OCR using external Python service
   */
  private static async performOCRViaPythonService(filePath: string): Promise<string> {
    const startTime = Date.now();
    
    try {
      const formData = new FormData();
      const fileBuffer = fs.readFileSync(filePath);
      const blob = new Blob([fileBuffer], { type: 'application/octet-stream' });
      formData.append('file', blob, path.basename(filePath));
      
      const response = await axios.post(
        `${config.ai.pythonServiceUrl}/ocr`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 120000, // 2 minutes timeout
        }
      );
      
      const processingTime = Date.now() - startTime;
      logger.info(`Python OCR completed in ${processingTime}ms`);
      
      return response.data.text || '';
    } catch (error) {
      logger.error('Python OCR service error:', error);
      throw error;
    }
  }

  /**
   * Classify document using external Python service
   */
  private static async classifyViaPythonService(
    ocrText: string, 
    filePath: string
  ): Promise<AIClassificationResult> {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        `${config.ai.pythonServiceUrl}/classify`,
        {
          text: ocrText,
          filename: path.basename(filePath),
          file_type: path.extname(filePath).substring(1)
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 1 minute timeout
        }
      );
      
      const processingTime = Date.now() - startTime;
      
      const result: AIClassificationResult = {
        document_type: response.data.document_type || 'unknown',
        confidence: response.data.confidence || 0,
        processing_time: processingTime,
        entities: response.data.entities || {},
        similar_documents: response.data.similar_documents || []
      };
      
      logger.info(`Python classification completed: ${result.document_type} (${result.confidence})`);
      
      return result;
    } catch (error) {
      logger.error('Python classification service error:', error);
      throw error;
    }
  }

  /**
   * Fallback classification using simple rules
   */
  private static fallbackClassification(ocrText: string, filePath: string): AIClassificationResult {
    const startTime = Date.now();
    const filename = path.basename(filePath).toLowerCase();
    const extension = path.extname(filePath).substring(1).toLowerCase();
    const text = ocrText.toLowerCase();
    
    let documentType = 'unknown';
    let confidence = 0.5; // Default low confidence for fallback
    
    // Simple rule-based classification
    if (extension === 'pdf' || filename.includes('report')) {
      documentType = 'report';
      confidence = 0.6;
    } else if (filename.includes('invoice') || text.includes('invoice') || text.includes('bill')) {
      documentType = 'invoice';
      confidence = 0.7;
    } else if (filename.includes('contract') || text.includes('agreement') || text.includes('contract')) {
      documentType = 'contract';
      confidence = 0.7;
    } else if (filename.includes('drawing') || extension === 'dwg' || extension === 'dxf') {
      documentType = 'technical_drawing';
      confidence = 0.8;
    } else if (['jpg', 'jpeg', 'png', 'bmp', 'tiff'].includes(extension)) {
      documentType = 'image';
      confidence = 0.6;
    } else if (['doc', 'docx'].includes(extension)) {
      documentType = 'document';
      confidence = 0.6;
    } else if (extension === 'xlsx') {
      documentType = 'spreadsheet';
      confidence = 0.7;
    }
    
    const processingTime = Date.now() - startTime;
    
    logger.info(`Fallback classification: ${documentType} (${confidence})`);
    
    return {
      document_type: documentType,
      confidence,
      processing_time: processingTime,
      entities: {
        dates: [],
        amounts: [],
        project_codes: []
      }
    };
  }

  /**
   * Extract entities from OCR text
   */
  static extractEntities(ocrText: string): {
    dates: string[];
    amounts: string[];
    project_codes: string[];
  } {
    const entities = {
      dates: [] as string[],
      amounts: [] as string[],
      project_codes: [] as string[]
    };

    // Extract dates (basic patterns)
    const datePatterns = [
      /\d{1,2}\/\d{1,2}\/\d{4}/g,
      /\d{4}-\d{1,2}-\d{1,2}/g,
      /\d{1,2}-\d{1,2}-\d{4}/g
    ];
    
    datePatterns.forEach(pattern => {
      const matches = ocrText.match(pattern);
      if (matches) {
        entities.dates.push(...matches);
      }
    });

    // Extract amounts (currency patterns)
    const amountPatterns = [
      /\$[\d,]+\.?\d*/g,
      /USD\s*[\d,]+\.?\d*/g,
      /₹[\d,]+\.?\d*/g,
      /INR\s*[\d,]+\.?\d*/g
    ];
    
    amountPatterns.forEach(pattern => {
      const matches = ocrText.match(pattern);
      if (matches) {
        entities.amounts.push(...matches);
      }
    });

    // Extract project codes (assuming format like PROJ-001, KM-2024-001, etc.)
    const projectCodePatterns = [
      /[A-Z]{2,4}-\d{3,4}/g,
      /[A-Z]{2,4}-\d{4}-\d{3}/g,
      /PROJ-\d+/g,
      /KM-\d+-\d+/g
    ];
    
    projectCodePatterns.forEach(pattern => {
      const matches = ocrText.match(pattern);
      if (matches) {
        entities.project_codes.push(...matches);
      }
    });

    return entities;
  }

  /**
   * Health check for external AI services
   */
  static async healthCheck(): Promise<{
    pythonService: boolean;
    tesseract: boolean;
  }> {
    const health = {
      pythonService: false,
      tesseract: true // Tesseract.js is always available
    };

    // Check Python service
    try {
      const response = await axios.get(`${config.ai.pythonServiceUrl}/health`, {
        timeout: 5000
      });
      health.pythonService = response.status === 200;
    } catch (error) {
      logger.warn('Python AI service health check failed');
    }

    return health;
  }
}