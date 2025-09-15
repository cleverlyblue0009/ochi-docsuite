import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/AuthController';
import { authenticateFirebaseToken, authenticateSessionCookie } from '../middleware/auth';
import { validateAndHandle } from '../middleware/validation';
import { authRateLimit } from '../middleware/security';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimit);

// Get Firebase configuration (public endpoint)
router.get('/config', AuthController.getFirebaseConfig);

// Google Sign-In
router.post(
  '/google-signin',
  validateAndHandle(AuthController.googleSignInValidation),
  AuthController.googleSignIn
);

// Email/Password Sign-Up (if supporting email authentication)
router.post(
  '/email-signup',
  validateAndHandle(AuthController.emailSignUpValidation),
  AuthController.emailSignUp
);

// Verify authentication status (can use either token or session cookie)
router.get(
  '/verify',
  (req, res, next) => {
    // Try session cookie first, then fallback to Firebase token
    if (req.cookies?.session) {
      authenticateSessionCookie(req, res, next);
    } else {
      authenticateFirebaseToken(req, res, next);
    }
  },
  AuthController.verifyAuth
);

// Get user profile (requires authentication)
router.get(
  '/profile',
  authenticateFirebaseToken,
  AuthController.getProfile
);

// Update user profile (requires authentication)
router.put(
  '/profile',
  authenticateFirebaseToken,
  validateAndHandle([
    body('first_name').optional().trim().isLength({ min: 1 }).withMessage('First name must not be empty'),
    body('last_name').optional().trim().isLength({ min: 1 }).withMessage('Last name must not be empty'),
    body('avatar_url').optional().isURL().withMessage('Avatar URL must be a valid URL')
  ]),
  AuthController.updateProfile
);

// Logout (requires authentication)
router.post(
  '/logout',
  (req, res, next) => {
    // Try session cookie first, then fallback to Firebase token
    if (req.cookies?.session) {
      authenticateSessionCookie(req, res, next);
    } else {
      authenticateFirebaseToken(req, res, next);
    }
  },
  AuthController.logout
);

// Logout from all devices (requires authentication)
router.post(
  '/logout-all',
  authenticateFirebaseToken,
  AuthController.logoutAll
);

export default router;