import { Request, Response, NextFunction } from 'express';
import { FirebaseService } from '../services/FirebaseService';
import { UserModel } from '../models/User';
import logger from '../utils/logger';

export interface AuthenticatedRequest extends Request {
  user?: any;
  firebaseUser?: any;
}

const firebaseService = FirebaseService.getInstance();

export const authenticateFirebaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const idToken = authHeader.substring(7);

    // Verify Firebase ID token
    const decodedToken = await firebaseService.verifyIdToken(idToken);
    
    // Get user from database
    let user = await UserModel.findByFirebaseUid(decodedToken.uid);
    
    if (!user) {
      // If user doesn't exist in our database, create them
      const userInfo = firebaseService.extractUserInfo(decodedToken);
      
      if (userInfo.provider === 'google') {
        // Extract Google-specific information
        const googleId = decodedToken.firebase.identities?.['google.com']?.[0] || decodedToken.uid;
        const [firstName, ...lastNameParts] = (userInfo.name || '').split(' ');
        
        user = await UserModel.createOrUpdateGoogleUser({
          email: userInfo.email,
          firebase_uid: decodedToken.uid,
          google_id: googleId,
          ...(firstName && { first_name: firstName }),
          ...(lastNameParts.join(' ') && { last_name: lastNameParts.join(' ') }),
          ...(userInfo.picture && { avatar_url: userInfo.picture })
        });
      } else {
        // Create user for email/password authentication
        const nameParts = userInfo.name?.split(' ') || [];
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ');
        
        user = await UserModel.create({
          email: userInfo.email,
          firebase_uid: decodedToken.uid,
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
          provider: 'email'
        });
      }
    }

    // Update last login
    await UserModel.updateLastLogin(user.id);

    // Attach user and Firebase token to request
    req.user = user;
    req.firebaseUser = decodedToken;
    
    next();
  } catch (error) {
    logger.error('Firebase authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    });
  }
};

export const authenticateSessionCookie = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const sessionCookie = req.cookies?.session;
    
    if (!sessionCookie) {
      res.status(401).json({
        success: false,
        error: 'Session cookie required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Verify session cookie
    const decodedClaims = await firebaseService.verifySessionCookie(sessionCookie);
    
    // Get user from database
    const user = await UserModel.findByFirebaseUid(decodedClaims.uid);
    
    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found',
        timestamp: new Date().toISOString()
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.firebaseUser = decodedClaims;
    
    next();
  } catch (error) {
    logger.error('Session cookie authentication error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session',
      timestamp: new Date().toISOString()
    });
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.substring(7);
      
      try {
        const decodedToken = await firebaseService.verifyIdToken(idToken);
        const user = await UserModel.findByFirebaseUid(decodedToken.uid);
        
        if (user) {
          req.user = user;
          req.firebaseUser = decodedToken;
        }
      } catch (error) {
        // Token is invalid, but we continue without authentication
        logger.warn('Optional auth failed, continuing without user:', error);
      }
    }

    next();
  } catch (error) {
    logger.error('Optional authentication error:', error);
    next();
  }
};

// Middleware to check if user is Google authenticated
export const requireGoogleAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.provider !== 'google') {
    res.status(403).json({
      success: false,
      error: 'Google authentication required',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  next();
};

// Middleware to extract user info from Firebase token without database lookup
export const extractFirebaseUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authorization header with Bearer token required',
        timestamp: new Date().toISOString()
      });
      return;
    }

    const idToken = authHeader.substring(7);
    const decodedToken = await firebaseService.verifyIdToken(idToken);
    const userInfo = firebaseService.extractUserInfo(decodedToken);
    
    req.firebaseUser = {
      ...decodedToken,
      ...userInfo
    };
    
    next();
  } catch (error) {
    logger.error('Firebase token extraction error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid Firebase token',
      timestamp: new Date().toISOString()
    });
  }
};