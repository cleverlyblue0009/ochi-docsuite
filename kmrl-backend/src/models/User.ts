import { pgPool } from '../config/database';
import { User } from '../types';
import logger from '../utils/logger';

export class UserModel {
  static async create(userData: {
    email: string;
    firebase_uid: string;
    google_id?: string;
    role?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    provider?: string;
  }): Promise<User> {
    const client = await pgPool.connect();
    try {
      const query = `
        INSERT INTO users (
          email, firebase_uid, google_id, role, first_name, 
          last_name, avatar_url, provider
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        userData.email,
        userData.firebase_uid,
        userData.google_id || null,
        userData.role || 'user',
        userData.first_name || null,
        userData.last_name || null,
        userData.avatar_url || null,
        userData.provider || 'email'
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
        SELECT * FROM users 
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

  static async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT * FROM users 
        WHERE firebase_uid = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [firebaseUid]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by Firebase UID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findByGoogleId(googleId: string): Promise<User | null> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT * FROM users 
        WHERE google_id = $1 AND is_active = true
      `;
      
      const result = await client.query(query, [googleId]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error finding user by Google ID:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id: number): Promise<User | null> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT * FROM users 
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

  static async updateProfile(
    id: number, 
    updateData: {
      first_name?: string;
      last_name?: string;
      avatar_url?: string;
    }
  ): Promise<User> {
    const client = await pgPool.connect();
    try {
      const updateFields = [];
      const values = [];
      let paramCount = 0;

      if (updateData.first_name !== undefined) {
        updateFields.push(`first_name = $${++paramCount}`);
        values.push(updateData.first_name);
      }
      if (updateData.last_name !== undefined) {
        updateFields.push(`last_name = $${++paramCount}`);
        values.push(updateData.last_name);
      }
      if (updateData.avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${++paramCount}`);
        values.push(updateData.avatar_url);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateFields.push(`updated_at = NOW()`);
      
      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${++paramCount}
        RETURNING *
      `;
      values.push(id);

      const result = await client.query(query, values);
      logger.info(`User profile updated: ${id}`);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateRole(id: number, role: string): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `
        UPDATE users 
        SET role = $1, updated_at = NOW()
        WHERE id = $2
      `;
      
      await client.query(query, [role, id]);
      logger.info(`User role updated: ${id} -> ${role}`);
    } catch (error) {
      logger.error('Error updating user role:', error);
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
        SELECT * FROM users 
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

  static async createOrUpdateGoogleUser(googleUserData: {
    email: string;
    firebase_uid: string;
    google_id: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
  }): Promise<User> {
    const client = await pgPool.connect();
    try {
      // Try to find existing user by email or Firebase UID
      let existingUser = await this.findByEmail(googleUserData.email);
      if (!existingUser) {
        existingUser = await this.findByFirebaseUid(googleUserData.firebase_uid);
      }

      if (existingUser) {
        // Update existing user with Google data
        const query = `
          UPDATE users 
          SET 
            firebase_uid = $1,
            google_id = $2,
            first_name = COALESCE($3, first_name),
            last_name = COALESCE($4, last_name),
            avatar_url = COALESCE($5, avatar_url),
            provider = 'google',
            updated_at = NOW()
          WHERE id = $6
          RETURNING *
        `;
        
        const values = [
          googleUserData.firebase_uid,
          googleUserData.google_id,
          googleUserData.first_name,
          googleUserData.last_name,
          googleUserData.avatar_url,
          existingUser.id
        ];
        
        const result = await client.query(query, values);
        logger.info(`Google user updated: ${googleUserData.email}`);
        
        return result.rows[0];
      } else {
        // Create new user
        return await this.create({
          ...googleUserData,
          provider: 'google'
        });
      }
    } catch (error) {
      logger.error('Error creating/updating Google user:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async storeSession(
    userId: number,
    firebaseUid: string,
    sessionCookie: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `
        INSERT INTO user_sessions (user_id, firebase_uid, session_cookie, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await client.query(query, [userId, firebaseUid, sessionCookie, expiresAt, ipAddress, userAgent]);
      logger.info(`Session stored for user: ${userId}`);
    } catch (error) {
      logger.error('Error storing session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getSession(sessionCookie: string): Promise<any> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT us.*, u.* 
        FROM user_sessions us
        JOIN users u ON us.user_id = u.id
        WHERE us.session_cookie = $1 AND us.expires_at > NOW() AND u.is_active = true
      `;

      const result = await client.query(query, [sessionCookie]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error getting session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async revokeSession(sessionCookie: string): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `DELETE FROM user_sessions WHERE session_cookie = $1`;
      await client.query(query, [sessionCookie]);
      logger.info('Session revoked');
    } catch (error) {
      logger.error('Error revoking session:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async revokeAllUserSessions(userId: number): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `DELETE FROM user_sessions WHERE user_id = $1`;
      await client.query(query, [userId]);
      logger.info(`All sessions revoked for user: ${userId}`);
    } catch (error) {
      logger.error('Error revoking all user sessions:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async cleanupExpiredSessions(): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `DELETE FROM user_sessions WHERE expires_at <= NOW()`;
      const result = await client.query(query);
      logger.info(`Cleaned up ${result.rowCount} expired sessions`);
    } catch (error) {
      logger.error('Error cleaning up expired sessions:', error);
    } finally {
      client.release();
    }
  }
}