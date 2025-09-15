import jwt from 'jsonwebtoken';
import { pgPool } from '../config/database';
import config from '../config';
import logger from './logger';
import { User } from '../types';

export interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class JWTService {
  static generateAccessToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'kmrl-backend',
      audience: 'kmrl-frontend'
    });
  }

  static generateRefreshToken(user: User): string {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
      issuer: 'kmrl-backend',
      audience: 'kmrl-frontend'
    });
  }

  static verifyAccessToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.secret, {
        issuer: 'kmrl-backend',
        audience: 'kmrl-frontend'
      }) as JWTPayload;
    } catch (error) {
      logger.error('Access token verification failed:', error);
      throw new Error('Invalid access token');
    }
  }

  static verifyRefreshToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, config.jwt.refreshSecret, {
        issuer: 'kmrl-backend',
        audience: 'kmrl-frontend'
      }) as JWTPayload;
    } catch (error) {
      logger.error('Refresh token verification failed:', error);
      throw new Error('Invalid refresh token');
    }
  }

  static async storeRefreshToken(
    userId: number, 
    refreshToken: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    const client = await pgPool.connect();
    try {
      // Calculate expiration time
      const expiresAt = new Date();
      expiresAt.setTime(expiresAt.getTime() + (7 * 24 * 60 * 60 * 1000)); // 7 days

      const query = `
        INSERT INTO user_sessions (user_id, refresh_token, expires_at, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5)
      `;

      await client.query(query, [userId, refreshToken, expiresAt, ipAddress, userAgent]);
      logger.info(`Refresh token stored for user: ${userId}`);
    } catch (error) {
      logger.error('Error storing refresh token:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async validateRefreshToken(refreshToken: string): Promise<boolean> {
    const client = await pgPool.connect();
    try {
      const query = `
        SELECT id FROM user_sessions 
        WHERE refresh_token = $1 AND expires_at > NOW()
      `;

      const result = await client.query(query, [refreshToken]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Error validating refresh token:', error);
      return false;
    } finally {
      client.release();
    }
  }

  static async revokeRefreshToken(refreshToken: string): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `DELETE FROM user_sessions WHERE refresh_token = $1`;
      await client.query(query, [refreshToken]);
      logger.info('Refresh token revoked');
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async revokeAllUserTokens(userId: number): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `DELETE FROM user_sessions WHERE user_id = $1`;
      await client.query(query, [userId]);
      logger.info(`All refresh tokens revoked for user: ${userId}`);
    } catch (error) {
      logger.error('Error revoking all user tokens:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async cleanupExpiredTokens(): Promise<void> {
    const client = await pgPool.connect();
    try {
      const query = `DELETE FROM user_sessions WHERE expires_at <= NOW()`;
      const result = await client.query(query);
      logger.info(`Cleaned up ${result.rowCount} expired refresh tokens`);
    } catch (error) {
      logger.error('Error cleaning up expired tokens:', error);
    } finally {
      client.release();
    }
  }

  static extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7);
  }

  static getTokenExpiration(token: string): Date | null {
    try {
      const decoded = jwt.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      logger.error('Error getting token expiration:', error);
      return null;
    }
  }
}