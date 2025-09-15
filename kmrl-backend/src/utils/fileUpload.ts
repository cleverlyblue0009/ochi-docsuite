import multer from 'multer';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import config from '../config';
import logger from './logger';

// Ensure upload directory exists
const uploadDir = config.upload.uploadDir;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userDir = path.join(uploadDir, 'temp');
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${uuidv4()}`;
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${extension}`);
  }
});

// File filter function
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedExtensions = config.upload.supportedFormats;
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${fileExtension} is not supported. Allowed types: ${allowedExtensions.join(', ')}`));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: 10 // Maximum 10 files per request
  }
});

// File validation utilities
export class FileValidator {
  static isValidFileType(filename: string): boolean {
    const extension = path.extname(filename).toLowerCase().substring(1);
    return config.upload.supportedFormats.includes(extension);
  }

  static isValidFileSize(fileSize: number): boolean {
    return fileSize <= config.upload.maxFileSize;
  }

  static getFileType(filename: string): string {
    const extension = path.extname(filename).toLowerCase().substring(1);
    
    const typeMap: { [key: string]: string } = {
      'pdf': 'document',
      'doc': 'document',
      'docx': 'document',
      'jpg': 'image',
      'jpeg': 'image',
      'png': 'image',
      'gif': 'image',
      'xlsx': 'spreadsheet',
      'xls': 'spreadsheet',
      'dwg': 'cad',
      'dxf': 'cad',
      'txt': 'text',
      'rtf': 'text'
    };

    return typeMap[extension] || 'unknown';
  }

  static getMimeTypeFromExtension(filename: string): string {
    const extension = path.extname(filename).toLowerCase().substring(1);
    
    const mimeMap: { [key: string]: string } = {
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'xls': 'application/vnd.ms-excel',
      'dwg': 'application/acad',
      'dxf': 'application/dxf',
      'txt': 'text/plain',
      'rtf': 'application/rtf'
    };

    return mimeMap[extension] || 'application/octet-stream';
  }
}

// File processing utilities
export class FileProcessor {
  static async generateThumbnail(filePath: string, outputPath: string): Promise<string> {
    try {
      const fileType = FileValidator.getFileType(filePath);
      
      if (fileType === 'image') {
        await sharp(filePath)
          .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(outputPath);
        
        return outputPath;
      }
      
      // For non-image files, we could generate a generic thumbnail
      // or use document preview services
      return '';
    } catch (error) {
      logger.error('Error generating thumbnail:', error);
      throw error;
    }
  }

  static async extractMetadata(filePath: string): Promise<Record<string, any>> {
    try {
      const stats = fs.statSync(filePath);
      const fileType = FileValidator.getFileType(filePath);
      
      const metadata: Record<string, any> = {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        type: fileType
      };

      // Extract additional metadata based on file type
      if (fileType === 'image') {
        const imageMetadata = await sharp(filePath).metadata();
        metadata.dimensions = {
          width: imageMetadata.width,
          height: imageMetadata.height
        };
        metadata.format = imageMetadata.format;
        metadata.colorSpace = imageMetadata.space;
      }

      return metadata;
    } catch (error) {
      logger.error('Error extracting metadata:', error);
      return {};
    }
  }

  static async moveToFinalDestination(tempPath: string, finalPath: string): Promise<void> {
    try {
      // Ensure destination directory exists
      const destinationDir = path.dirname(finalPath);
      if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
      }

      // Move file
      fs.renameSync(tempPath, finalPath);
      logger.info(`File moved from ${tempPath} to ${finalPath}`);
    } catch (error) {
      logger.error('Error moving file:', error);
      throw error;
    }
  }

  static async cleanupTempFile(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Temp file cleaned up: ${filePath}`);
      }
    } catch (error) {
      logger.error('Error cleaning up temp file:', error);
    }
  }

  static generateUniqueFilename(originalName: string): string {
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    const uniqueId = uuidv4();
    const timestamp = Date.now();
    
    return `${baseName}_${timestamp}_${uniqueId}${extension}`;
  }

  static async validateFile(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: 'File does not exist' };
      }

      // Check file size
      const stats = fs.statSync(filePath);
      if (!FileValidator.isValidFileSize(stats.size)) {
        return { 
          valid: false, 
          error: `File size exceeds maximum allowed size of ${config.upload.maxFileSize} bytes` 
        };
      }

      // Basic file integrity check
      if (stats.size === 0) {
        return { valid: false, error: 'File is empty' };
      }

      return { valid: true };
    } catch (error) {
      logger.error('Error validating file:', error);
      return { valid: false, error: 'File validation failed' };
    }
  }
}

// Error handling for multer
export const handleMulterError = (error: any) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return `File too large. Maximum size is ${config.upload.maxFileSize} bytes`;
      case 'LIMIT_FILE_COUNT':
        return 'Too many files. Maximum 10 files allowed';
      case 'LIMIT_UNEXPECTED_FILE':
        return 'Unexpected file field';
      default:
        return `Upload error: ${error.message}`;
    }
  }
  return error.message || 'Unknown upload error';
};