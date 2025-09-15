import { pgPool } from '../config/database';
import { User } from '../types';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

export class UserModel {
  static async create(userData: Omit<User, 'id' | 'created_at'>): Promise<User> {
    const client = await pgPool.connect();
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password_hash, 12);
      
      const query = `
        INSERT INTO users (email, password_hash, role, first_name, last_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, role, first_name, last_name, is_active, created_at, updated_at
      `;
      
      const values = [
        userData.email,
        hashedPassword,
        userData.role || 'user',
        (userData as any).first_name,
        (userData as any).last_name
      ];
      
      const result = await client.query(query, values);
      logger.info(`User created: ${userData.email}`);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByEmail(email: string): Promise<User | null> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT id, email, password_hash, role, first_name, last_name, 
               is_active, last_login, created_at, updated_at
        FROM users 
        WHERE email = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [email]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id: number): Promise<User | null> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT id, email, password_hash, role, first_name, last_name, 
               is_active, last_login, created_at, updated_at
        FROM users 
        WHERE id = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateLastLogin(id: number): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `
        UPDATE users 
        SET last_login = NOW() 
        WHERE id = $1
      `;
      
      await client.query(query, [id]);
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      logger.error('Error validating password:', error);
      return false;
    }
  }

  static async updatePassword(id: number, newPassword: string): Promise<void> {
    const client = await pgPool.connect();
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 12);
      
      const query = `
        UPDATE users 
        SET password_hash = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await client.query(query, [hashedPassword, id]);
      logger.info(`Password updated for user ID: ${id}`);
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getAllUsers(page: number = 1, limit: number = 10): Promise<{ users: User[], total: number }> {
    const client = await pgPool.connect();
    try {
      const offset = (page - 1) * limit;
      
      const countQuery = `SELECT COUNT(*) FROM users WHERE is_active = true`;
      const countResult = await client.query(countQuery);
      const total = parseInt(countResult.rows[0].count);
      
      const query = `
        SELECT id, email, role, first_name, last_name, 
               is_active, last_login, created_at, updated_at
        FROM users 
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const result = await client.query(query, [limit, offset]);
      
      return {
        users: result.rows,
        total
      };
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deactivateUser(id: number): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `
        UPDATE users 
        SET is_active = false, updated_at = NOW()
        WHERE id = $1
      `;
      
      await client.query(query, [id]);
      logger.info(`User deactivated: ${id}`);
    } catch (error) {
      logger.error('Error deactivating user:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}