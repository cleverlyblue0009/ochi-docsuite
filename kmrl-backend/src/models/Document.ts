import { pgPool } from '../config/database';
import { Document, SearchQuery, SearchResult } from '../types';
import logger from '../utils/logger';

export class DocumentModel {
  static async create(documentData: Omit<Document, 'id' | 'created_at' | 'updated_at'>): Promise<Document> {
    const client = await pgPool.connect();
    try {
      const query = `
        INSERT INTO documents (
          filename, original_filename, file_size, mime_type, file_path,
          s3_key, project_id, uploaded_by, status, metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        documentData.filename,
        documentData.original_filename,
        documentData.file_size,
        documentData.mime_type,
        documentData.file_path,
        (documentData as any).s3_key || null,
        documentData.project_id || null,
        documentData.uploaded_by,
        documentData.status || 'pending',
        JSON.stringify(documentData.metadata || {})
      ];
      
      const result = await client.query(query, values);
      logger.info(`Document created: ${documentData.filename}`);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating document:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id: number): Promise<Document | null> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT d.*, p.name as project_name, u.email as uploaded_by_email
        FROM documents d
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE d.id = $1
      `;
      
      const result = await client.query(query, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding document by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateStatus(id: number, status: string, additionalData?: any): Promise<void> {
    const client = await pgPool.connect();
    try {
      let query = `UPDATE documents SET status = $1, updated_at = NOW()`;
      let values = [status];
      let paramCount = 1;

      if (additionalData) {
        if (additionalData.ai_classification) {
          query += `, ai_classification = $${++paramCount}`;
          values.push(additionalData.ai_classification);
        }
        if (additionalData.confidence_score !== undefined) {
          query += `, confidence_score = $${++paramCount}`;
          values.push(additionalData.confidence_score);
        }
        if (additionalData.processing_time !== undefined) {
          query += `, processing_time = $${++paramCount}`;
          values.push(additionalData.processing_time);
        }
        if (additionalData.ocr_text) {
          query += `, ocr_text = $${++paramCount}`;
          values.push(additionalData.ocr_text);
        }
        if (status === 'completed') {
          query += `, processed_at = NOW()`;
        }
      }

      query += ` WHERE id = $${++paramCount}`;
      values.push(id);

      await client.query(query, values);
      logger.info(`Document status updated: ${id} -> ${status}`);
    } catch (error) {
      logger.error('Error updating document status:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getDocuments(
    filters: {
      project_id?: number;
      status?: string;
      ai_classification?: string;
      uploaded_by?: number;
    } = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{ documents: Document[], total: number }> {
    const client = await pgPool.connect();
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let values = [];
      let paramCount = 0;

      // Build WHERE conditions dynamically
      if (filters.project_id) {
        whereConditions.push(`d.project_id = $${++paramCount}`);
        values.push(filters.project_id);
      }
      if (filters.status) {
        whereConditions.push(`d.status = $${++paramCount}`);
        values.push(filters.status);
      }
      if (filters.ai_classification) {
        whereConditions.push(`d.ai_classification = $${++paramCount}`);
        values.push(filters.ai_classification);
      }
      if (filters.uploaded_by) {
        whereConditions.push(`d.uploaded_by = $${++paramCount}`);
        values.push(filters.uploaded_by);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count total documents
      const countQuery = `
        SELECT COUNT(*) 
        FROM documents d
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get documents with pagination
      const query = `
        SELECT d.*, p.name as project_name, u.email as uploaded_by_email
        FROM documents d
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.uploaded_by = u.id
        ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      values.push(limit, offset);

      const result = await client.query(query, values);

      return {
        documents: result.rows,
        total
      };
    } catch (error) {
      logger.error('Error getting documents:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async searchDocuments(searchQuery: SearchQuery): Promise<SearchResult> {
    const client = await pgPool.connect();
    try {
      const startTime = Date.now();
      const page = searchQuery.page || 1;
      const limit = searchQuery.limit || 10;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let values = [];
      let paramCount = 0;

      // Full-text search on OCR text and filename
      if (searchQuery.query) {
        whereConditions.push(`(
          to_tsvector('english', COALESCE(d.ocr_text, '')) @@ plainto_tsquery('english', $${++paramCount})
          OR d.original_filename ILIKE $${++paramCount}
        )`);
        values.push(searchQuery.query, `%${searchQuery.query}%`);
        paramCount++; // Account for the second parameter
      }

      // Apply filters
      if (searchQuery.filters) {
        if (searchQuery.filters.document_type) {
          whereConditions.push(`d.ai_classification = $${++paramCount}`);
          values.push(searchQuery.filters.document_type);
        }
        if (searchQuery.filters.project_id) {
          whereConditions.push(`d.project_id = $${++paramCount}`);
          values.push(searchQuery.filters.project_id);
        }
        if (searchQuery.filters.confidence_min) {
          whereConditions.push(`d.confidence_score >= $${++paramCount}`);
          values.push(searchQuery.filters.confidence_min);
        }
        if (searchQuery.filters.date_range) {
          whereConditions.push(`d.created_at >= $${++paramCount} AND d.created_at <= $${++paramCount}`);
          values.push(searchQuery.filters.date_range.start, searchQuery.filters.date_range.end);
          paramCount++; // Account for the second parameter
        }
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count total results
      const countQuery = `
        SELECT COUNT(*) 
        FROM documents d
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Build ORDER BY clause
      let orderBy = 'ORDER BY d.created_at DESC';
      if (searchQuery.sort === 'relevance' && searchQuery.query) {
        orderBy = `ORDER BY ts_rank(to_tsvector('english', COALESCE(d.ocr_text, '')), plainto_tsquery('english', '${searchQuery.query}')) DESC`;
      } else if (searchQuery.sort === 'confidence') {
        orderBy = 'ORDER BY d.confidence_score DESC NULLS LAST';
      }

      // Get search results
      const query = `
        SELECT d.*, p.name as project_name, u.email as uploaded_by_email
        FROM documents d
        LEFT JOIN projects p ON d.project_id = p.id
        LEFT JOIN users u ON d.uploaded_by = u.id
        ${whereClause}
        ${orderBy}
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      values.push(limit, offset);

      const result = await client.query(query, values);
      const processingTime = Date.now() - startTime;

      return {
        documents: result.rows,
        total,
        page,
        limit,
        processing_time: processingTime
      };
    } catch (error) {
      logger.error('Error searching documents:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteDocument(id: number): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `DELETE FROM documents WHERE id = $1`;
      await client.query(query, [id]);
      logger.info(`Document deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getDocumentsByProject(projectId: number): Promise<Document[]> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT d.*, u.email as uploaded_by_email
        FROM documents d
        LEFT JOIN users u ON d.uploaded_by = u.id
        WHERE d.project_id = $1
        ORDER BY d.created_at DESC
      `;
      
      const result = await client.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting documents by project:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getDashboardMetrics(): Promise<any> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as documents_processed_today,
          AVG(confidence_score) as avg_confidence,
          AVG(processing_time) as avg_processing_time,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_documents,
          COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_documents,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_documents
        FROM documents
      `;
      
      const result = await client.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}