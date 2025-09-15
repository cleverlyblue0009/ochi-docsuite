import { Request, Response } from 'express';
import { body } from 'express-validator';
import { UserModel } from '../models/User';
import { FirebaseService } from '../services/FirebaseService';
import logger from '../utils/logger';
import { APIResponse } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';

const firebaseService = FirebaseService.getInstance();

export class AuthController {
  // Validation for Google sign-in
  static googleSignInValidation = [
    body('idToken')
      .notEmpty()
      .withMessage('Firebase ID token is required')
  ];

  // Validation for email sign-up (if supporting email/password)
  static emailSignUpValidation = [
    body('idToken')
      .notEmpty()
      .withMessage('Firebase ID token is required'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required')
  ];

  /**
   * Handle Google Sign-In
   */
  static async googleSignIn(req: Request, res: Response): Promise<void> {
    try {
      const { idToken } = req.body;

      // Validate Google token
      const validation = await firebaseService.validateGoogleToken(idToken);
      
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error || 'Invalid Google token',
          timestamp: new Date().toISOString()
        } as APIResponse);
        return;
      }

      const userInfo = validation.userInfo!;

      // Extract Google user data
      const googleId = userInfo.uid; // Firebase UID is used as Google ID
      const [firstName, ...lastNameParts] = (userInfo.name || '').split(' ');

      // Create or update user in database
      const user = await UserModel.createOrUpdateGoogleUser({
        email: userInfo.email,
        firebase_uid: userInfo.uid,
        google_id: googleId,
        first_name: firstName || undefined,
        last_name: lastNameParts.join(' ') || undefined,
        avatar_url: userInfo.picture || undefined
      });

      // Create session cookie for better security
      const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days
      const sessionCookie = await firebaseService.createSessionCookie(idToken, expiresIn);
      
      // Store session in database
      const expiresAt = new Date(Date.now() + expiresIn);
      await UserModel.storeSession(
        user.id,
        user.firebase_uid,
        sessionCookie,
        expiresAt,
        req.ip,
        req.get('User-Agent')
      );

      // Set session cookie
      res.cookie('session', sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url,
            role: user.role,
            provider: user.provider,
            created_at: user.created_at
          },
          session: {
            expires_at: expiresAt.toISOString()
          }
        },
        message: 'Google sign-in successful',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info(`Google sign-in successful: ${user.email}`);
    } catch (error) {
      logger.error('Google sign-in error:', error);
      res.status(500).json({
        success: false,
        error: 'Google sign-in failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  /**
   * Handle email/password sign-up (if needed)
   */
  static async emailSignUp(req: Request, res: Response): Promise<void> {
    try {
      const { idToken, email } = req.body;

      // Verify Firebase ID token
      const decodedToken = await firebaseService.verifyIdToken(idToken);
      
      if (decodedToken.email !== email) {
        res.status(400).json({
          success: false,
          error: 'Token email does not match provided email',
          timestamp: new Date().toISOString()
        } as APIResponse);
        return;
      }

      // Check if user already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User already exists with this email',
          timestamp: new Date().toISOString()
        } as APIResponse);
        return;
      }

      // Create new user
      const user = await UserModel.create({
        email: decodedToken.email!,
        firebase_uid: decodedToken.uid,
        first_name: decodedToken.name?.split(' ')[0] || undefined,
        last_name: decodedToken.name?.split(' ').slice(1).join(' ') || undefined,
        provider: 'email'
      });

      // Create session cookie
      const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days
      const sessionCookie = await firebaseService.createSessionCookie(idToken, expiresIn);
      
      const expiresAt = new Date(Date.now() + expiresIn);
      await UserModel.storeSession(
        user.id,
        user.firebase_uid,
        sessionCookie,
        expiresAt,
        req.ip,
        req.get('User-Agent')
      );

      res.cookie('session', sessionCookie, {
        maxAge: expiresIn,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
      });

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            provider: user.provider,
            created_at: user.created_at
          }
        },
        message: 'Email sign-up successful',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info(`Email sign-up successful: ${user.email}`);
    } catch (error) {
      logger.error('Email sign-up error:', error);
      res.status(500).json({
        success: false,
        error: 'Email sign-up failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  /**
   * Verify authentication status
   */
  static async verifyAuth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url,
            role: user.role,
            provider: user.provider,
            last_login: user.last_login,
            created_at: user.created_at
          },
          firebase_uid: user.firebase_uid
        },
        timestamp: new Date().toISOString()
      } as APIResponse);
    } catch (error) {
      logger.error('Auth verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Authentication verification failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  /**
   * Logout user
   */
  static async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const sessionCookie = req.cookies?.session;

      // Revoke session cookie from database
      if (sessionCookie) {
        await UserModel.revokeSession(sessionCookie);
      }

      // Revoke Firebase refresh tokens
      await firebaseService.revokeRefreshTokens(user.firebase_uid);

      // Clear session cookie
      res.clearCookie('session');

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info(`User logged out: ${user.email}`);
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  /**
   * Logout from all devices
   */
  static async logoutAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      // Revoke all sessions from database
      await UserModel.revokeAllUserSessions(user.id);

      // Revoke all Firebase refresh tokens
      await firebaseService.revokeRefreshTokens(user.firebase_uid);

      // Clear current session cookie
      res.clearCookie('session');

      res.status(200).json({
        success: true,
        message: 'Logged out from all devices',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info(`User logged out from all devices: ${user.email}`);
    } catch (error) {
      logger.error('Logout all error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout from all devices failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  /**
   * Get user profile
   */
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;

      res.status(200).json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          avatar_url: user.avatar_url,
          role: user.role,
          provider: user.provider,
          is_active: user.is_active,
          last_login: user.last_login,
          created_at: user.created_at,
          updated_at: user.updated_at
        },
        timestamp: new Date().toISOString()
      } as APIResponse);
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      const { first_name, last_name, avatar_url } = req.body;

      const updatedUser = await UserModel.updateProfile(user.id, {
        first_name,
        last_name,
        avatar_url
      });

      res.status(200).json({
        success: true,
        data: {
          id: updatedUser.id,
          email: updatedUser.email,
          first_name: updatedUser.first_name,
          last_name: updatedUser.last_name,
          avatar_url: updatedUser.avatar_url,
          role: updatedUser.role,
          provider: updatedUser.provider,
          updated_at: updatedUser.updated_at
        },
        message: 'Profile updated successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info(`Profile updated for user: ${user.email}`);
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  /**
   * Get Firebase configuration for frontend
   */
  static async getFirebaseConfig(req: Request, res: Response): Promise<void> {
    try {
      // Only return public configuration
      res.status(200).json({
        success: true,
        data: {
          projectId: process.env.FIREBASE_PROJECT_ID,
          authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
          apiKey: process.env.FIREBASE_WEB_API_KEY, // You'll need to add this to env
          googleClientId: process.env.GOOGLE_CLIENT_ID
        },
        timestamp: new Date().toISOString()
      } as APIResponse);
    } catch (error) {
      logger.error('Get Firebase config error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get Firebase configuration',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
}