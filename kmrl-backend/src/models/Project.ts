import { pgPool } from '../config/database';
import { Project } from '../types';
import logger from '../utils/logger';

export class ProjectModel {
  static async create(projectData: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const client = await pgPool.connect();
    try {
      const query = `
        INSERT INTO projects (name, description, status, progress, team_size, start_date, end_date, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        projectData.name,
        projectData.description || null,
        projectData.status || 'active',
        projectData.progress || 0,
        projectData.team_size || 0,
        projectData.start_date || null,
        projectData.end_date || null,
        (projectData as any).created_by || null
      ];
      
      const result = await client.query(query, values);
      logger.info(`Project created: ${projectData.name}`);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id: number): Promise<Project | null> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT p.*, u.email as created_by_email,
               COUNT(d.id) as document_count,
               COUNT(pm.user_id) as member_count
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN documents d ON p.id = d.project_id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        WHERE p.id = $1
        GROUP BY p.id, u.email
      `;
      
      const result = await client.query(query, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding project by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getProjects(
    filters: {
      status?: string;
      created_by?: number;
    } = {},
    page: number = 1,
    limit: number = 10
  ): Promise<{ projects: Project[], total: number }> {
    const client = await pgPool.connect();
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let values = [];
      let paramCount = 0;

      // Build WHERE conditions dynamically
      if (filters.status) {
        whereConditions.push(`p.status = $${++paramCount}`);
        values.push(filters.status);
      }
      if (filters.created_by) {
        whereConditions.push(`p.created_by = $${++paramCount}`);
        values.push(filters.created_by);
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count total projects
      const countQuery = `
        SELECT COUNT(*) 
        FROM projects p
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get projects with additional info
      const query = `
        SELECT p.*, u.email as created_by_email,
               COUNT(DISTINCT d.id) as document_count,
               COUNT(DISTINCT pm.user_id) as member_count,
               AVG(d.confidence_score) as avg_document_confidence
        FROM projects p
        LEFT JOIN users u ON p.created_by = u.id
        LEFT JOIN documents d ON p.id = d.project_id
        LEFT JOIN project_members pm ON p.id = pm.project_id
        ${whereClause}
        GROUP BY p.id, u.email
        ORDER BY p.created_at DESC
        LIMIT $${++paramCount} OFFSET $${++paramCount}
      `;
      values.push(limit, offset);

      const result = await client.query(query, values);

      return {
        projects: result.rows,
        total
      };
    } catch (error) {
      logger.error('Error getting projects:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateProject(id: number, updateData: Partial<Project>): Promise<Project> {
    const client = await pgPool.connect();
    try {
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      // Build dynamic update query
      if (updateData.name !== undefined) {
        updateFields.push(`name = $${++paramCount}`);
        values.push(updateData.name);
      }
      if (updateData.description !== undefined) {
        updateFields.push(`description = $${++paramCount}`);
        values.push(updateData.description);
      }
      if (updateData.status !== undefined) {
        updateFields.push(`status = $${++paramCount}`);
        values.push(updateData.status);
      }
      if (updateData.progress !== undefined) {
        updateFields.push(`progress = $${++paramCount}`);
        values.push(updateData.progress);
      }
      if (updateData.team_size !== undefined) {
        updateFields.push(`team_size = $${++paramCount}`);
        values.push(updateData.team_size);
      }
      if (updateData.start_date !== undefined) {
        updateFields.push(`start_date = $${++paramCount}`);
        values.push(updateData.start_date);
      }
      if (updateData.end_date !== undefined) {
        updateFields.push(`end_date = $${++paramCount}`);
        values.push(updateData.end_date);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      
      const query = `
        UPDATE projects 
        SET ${updateFields.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;
      values.push(id);

      const result = await client.query(query, values);
      logger.info(`Project updated: ${id}`);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteProject(id: number): Promise<void> {
    const client = await pgPool.connect();
    try {
      // First, update documents to remove project association
      await client.query('UPDATE documents SET project_id = NULL WHERE project_id = $1', [id]);
      
      // Then delete the project
      const query = `DELETE FROM projects WHERE id = $1`;
      await client.query(query, [id]);
      logger.info(`Project deleted: ${id}`);
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async addProjectMember(projectId: number, userId: number, role: string = 'member'): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (project_id, user_id) DO UPDATE SET role = $3
      `;
      
      await client.query(query, [projectId, userId, role]);
      logger.info(`User ${userId} added to project ${projectId} as ${role}`);
    } catch (error) {
      logger.error('Error adding project member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async removeProjectMember(projectId: number, userId: number): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `DELETE FROM project_members WHERE project_id = $1 AND user_id = $2`;
      await client.query(query, [projectId, userId]);
      logger.info(`User ${userId} removed from project ${projectId}`);
    } catch (error) {
      logger.error('Error removing project member:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getProjectMembers(projectId: number): Promise<any[]> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT pm.*, u.email, u.first_name, u.last_name
        FROM project_members pm
        JOIN users u ON pm.user_id = u.id
        WHERE pm.project_id = $1
        ORDER BY pm.added_at DESC
      `;
      
      const result = await client.query(query, [projectId]);
      return result.rows;
    } catch (error) {
      logger.error('Error getting project members:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async calculateProjectProgress(projectId: number): Promise<number> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_documents,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_documents
        FROM documents 
        WHERE project_id = $1
      `;
      
      const result = await client.query(query, [projectId]);
      const { total_documents, completed_documents } = result.rows[0];
      
      if (total_documents === 0) return 0;
      
      const progress = Math.round((completed_documents / total_documents) * 100);
      
      // Update project progress
      await client.query(
        'UPDATE projects SET progress = $1, updated_at = NOW() WHERE id = $2',
        [progress, projectId]
      );
      
      return progress;
    } catch (error) {
      logger.error('Error calculating project progress:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getProjectStats(): Promise<any> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT 
          COUNT(*) as total_projects,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_projects,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_projects,
          AVG(progress) as avg_progress
        FROM projects
      `;
      
      const result = await client.query(query);
      return result.rows[0];
    } catch (error) {
      logger.error('Error getting project stats:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}