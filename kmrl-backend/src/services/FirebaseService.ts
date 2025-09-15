import admin from 'firebase-admin';
import config from '../config';
import logger from '../utils/logger';

export class FirebaseService {
  private static instance: FirebaseService;
  private app: admin.app.App;

  private constructor() {
    this.initializeFirebase();
  }

  static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService();
    }
    return FirebaseService.instance;
  }

  private initializeFirebase(): void {
    try {
      // Initialize Firebase Admin SDK
      const serviceAccount = {
        type: 'service_account',
        project_id: config.firebase.projectId,
        private_key_id: config.firebase.privateKeyId,
        private_key: config.firebase.privateKey,
        client_email: config.firebase.clientEmail,
        client_id: config.firebase.clientId,
        auth_uri: config.firebase.authUri,
        token_uri: config.firebase.tokenUri,
        auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
        client_x509_cert_url: config.firebase.clientCertUrl
      };

      this.app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: config.firebase.projectId
      });

      logger.info('Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Firebase Admin SDK:', error);
      throw error;
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.error('Failed to verify Firebase ID token:', error);
      throw new Error('Invalid Firebase token');
    }
  }

  async getUserByUid(uid: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().getUser(uid);
      return userRecord;
    } catch (error) {
      logger.error('Failed to get user by UID:', error);
      throw new Error('User not found');
    }
  }

  async createUser(userData: {
    email: string;
    displayName?: string;
    photoURL?: string;
    emailVerified?: boolean;
  }): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().createUser(userData);
      logger.info(`Firebase user created: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      logger.error('Failed to create Firebase user:', error);
      throw error;
    }
  }

  async updateUser(uid: string, userData: {
    email?: string;
    displayName?: string;
    photoURL?: string;
    emailVerified?: boolean;
    disabled?: boolean;
  }): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().updateUser(uid, userData);
      logger.info(`Firebase user updated: ${uid}`);
      return userRecord;
    } catch (error) {
      logger.error('Failed to update Firebase user:', error);
      throw error;
    }
  }

  async deleteUser(uid: string): Promise<void> {
    try {
      await admin.auth().deleteUser(uid);
      logger.info(`Firebase user deleted: ${uid}`);
    } catch (error) {
      logger.error('Failed to delete Firebase user:', error);
      throw error;
    }
  }

  async setCustomClaims(uid: string, claims: { [key: string]: any }): Promise<void> {
    try {
      await admin.auth().setCustomUserClaims(uid, claims);
      logger.info(`Custom claims set for user: ${uid}`, claims);
    } catch (error) {
      logger.error('Failed to set custom claims:', error);
      throw error;
    }
  }

  async revokeRefreshTokens(uid: string): Promise<void> {
    try {
      await admin.auth().revokeRefreshTokens(uid);
      logger.info(`Refresh tokens revoked for user: ${uid}`);
    } catch (error) {
      logger.error('Failed to revoke refresh tokens:', error);
      throw error;
    }
  }

  async verifySessionCookie(sessionCookie: string): Promise<admin.auth.DecodedIdToken> {
    try {
      const decodedClaims = await admin.auth().verifySessionCookie(sessionCookie);
      return decodedClaims;
    } catch (error) {
      logger.error('Failed to verify session cookie:', error);
      throw new Error('Invalid session cookie');
    }
  }

  async createSessionCookie(idToken: string, expiresIn: number = 5 * 24 * 60 * 60 * 1000): Promise<string> {
    try {
      // Set session expiration to 5 days by default
      const sessionCookie = await admin.auth().createSessionCookie(idToken, { expiresIn });
      return sessionCookie;
    } catch (error) {
      logger.error('Failed to create session cookie:', error);
      throw error;
    }
  }

  async listUsers(maxResults: number = 1000, pageToken?: string): Promise<{
    users: admin.auth.UserRecord[];
    pageToken?: string;
  }> {
    try {
      const listUsersResult = await admin.auth().listUsers(maxResults, pageToken);
      return {
        users: listUsersResult.users,
        pageToken: listUsersResult.pageToken
      };
    } catch (error) {
      logger.error('Failed to list users:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      return userRecord;
    } catch (error) {
      logger.error('Failed to get user by email:', error);
      throw new Error('User not found');
    }
  }

  // Utility method to extract user info from Firebase token
  extractUserInfo(decodedToken: admin.auth.DecodedIdToken): {
    uid: string;
    email: string;
    name?: string;
    picture?: string;
    provider: string;
    emailVerified: boolean;
  } {
    const providers = decodedToken.firebase.identities || {};
    const isGoogleUser = providers['google.com'] && providers['google.com'].length > 0;
    
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name,
      picture: decodedToken.picture,
      provider: isGoogleUser ? 'google' : 'email',
      emailVerified: decodedToken.email_verified || false
    };
  }

  // Method to validate Google ID token specifically
  async validateGoogleToken(idToken: string): Promise<{
    valid: boolean;
    userInfo?: any;
    error?: string;
  }> {
    try {
      const decodedToken = await this.verifyIdToken(idToken);
      const userInfo = this.extractUserInfo(decodedToken);
      
      // Additional validation for Google sign-in
      if (userInfo.provider !== 'google') {
        return {
          valid: false,
          error: 'Token is not from Google provider'
        };
      }

      return {
        valid: true,
        userInfo
      };
    } catch (error) {
      logger.error('Google token validation failed:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Token validation failed'
      };
    }
  }

  getApp(): admin.app.App {
    return this.app;
  }
}