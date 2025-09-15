import { Request, Response } from 'express';
import { body } from 'express-validator';
import { UserModel } from '../models/User';
import { JWTService } from '../utils/jwt';
import logger from '../utils/logger';
import { APIResponse } from '../types';

export class AuthController {
  static registerValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('first_name')
      .trim()
      .isLength({ min: 1 })
      .withMessage('First name is required'),
    body('last_name')
      .trim()
      .isLength({ min: 1 })
      .withMessage('Last name is required'),
    body('role')
      .optional()
      .isIn(['admin', 'manager', 'user'])
      .withMessage('Role must be admin, manager, or user')
  ];

  static loginValidation = [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ];

  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, first_name, last_name, role } = req.body;

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
      const userData = {
        email,
        password_hash: password, // Will be hashed in the model
        role: role || 'user',
        first_name,
        last_name
      };

      const user = await UserModel.create(userData);

      // Generate tokens
      const accessToken = JWTService.generateAccessToken(user);
      const refreshToken = JWTService.generateRefreshToken(user);

      // Store refresh token
      await JWTService.storeRefreshToken(
        user.id,
        refreshToken,
        req.ip,
        req.get('User-Agent')
      );

      // Remove sensitive data from response
      const { password_hash, ...userResponse } = user;

      res.status(201).json({
        success: true,
        data: {
          user: userResponse,
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: '15m'
          }
        },
        message: 'User registered successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info(`User registered: ${email}`);
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          timestamp: new Date().toISOString()
        } as APIResponse);
        return;
      }

      // Validate password
      const isValidPassword = await UserModel.validatePassword(password, user.password_hash);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          timestamp: new Date().toISOString()
        } as APIResponse);
        return;
      }

      // Update last login
      await UserModel.updateLastLogin(user.id);

      // Generate tokens
      const accessToken = JWTService.generateAccessToken(user);
      const refreshToken = JWTService.generateRefreshToken(user);

      // Store refresh token
      await JWTService.storeRefreshToken(
        user.id,
        refreshToken,
        req.ip,
        req.get('User-Agent')
      );

      // Remove sensitive data from response
      const { password_hash, ...userResponse } = user;

      res.status(200).json({
        success: true,
        data: {
          user: userResponse,
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: '15m'
          }
        },
        message: 'Login successful',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info(`User logged in: ${email}`);
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
          timestamp: new Date().toISOString()
        } as APIResponse);
        return;
      }

      // Verify refresh token
      const payload = JWTService.verifyRefreshToken(refresh_token);

      // Check if refresh token exists in database
      const isValidToken = await JWTService.validateRefreshToken(refresh_token);
      if (!isValidToken) {
        res.status(401).json({
          success: false,
          error: 'Invalid refresh token',
          timestamp: new Date().toISOString()
        } as APIResponse);
        return;
      }

      // Get user details
      const user = await UserModel.findById(payload.userId);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'User not found',
          timestamp: new Date().toISOString()
        } as APIResponse);
        return;
      }

      // Generate new access token
      const accessToken = JWTService.generateAccessToken(user);

      res.status(200).json({
        success: true,
        data: {
          access_token: accessToken,
          expires_in: '15m'
        },
        message: 'Token refreshed successfully',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info(`Token refreshed for user: ${user.email}`);
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        error: 'Token refresh failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refresh_token } = req.body;

      if (refresh_token) {
        // Revoke the specific refresh token
        await JWTService.revokeRefreshToken(refresh_token);
      }

      res.status(200).json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info('User logged out');
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }

  static async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      // Revoke all refresh tokens for the user
      await JWTService.revokeAllUserTokens(user.id);

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

  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;

      // Remove sensitive data
      const { password_hash, ...userProfile } = user;

      res.status(200).json({
        success: true,
        data: userProfile,
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

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as any).user;
      const { current_password, new_password } = req.body;

      // Validate current password
      const isValidPassword = await UserModel.validatePassword(current_password, user.password_hash);
      if (!isValidPassword) {
        res.status(400).json({
          success: false,
          error: 'Current password is incorrect',
          timestamp: new Date().toISOString()
        } as APIResponse);
        return;
      }

      // Update password
      await UserModel.updatePassword(user.id, new_password);

      // Revoke all refresh tokens to force re-login
      await JWTService.revokeAllUserTokens(user.id);

      res.status(200).json({
        success: true,
        message: 'Password changed successfully. Please login again.',
        timestamp: new Date().toISOString()
      } as APIResponse);

      logger.info(`Password changed for user: ${user.email}`);
    } catch (error) {
      logger.error('Change password error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to change password',
        timestamp: new Date().toISOString()
      } as APIResponse);
    }
  }
}