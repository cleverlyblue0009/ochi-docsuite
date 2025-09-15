import { Router } from 'express';
import { body } from 'express-validator';
import { AuthController } from '../controllers/AuthController';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateAndHandle } from '../middleware/validation';
import { authRateLimit } from '../middleware/security';

const router = Router();

// Apply rate limiting to all auth routes
router.use(authRateLimit);

// User registration
router.post(
  '/register',
  validateAndHandle(AuthController.registerValidation),
  AuthController.register
);

// User login
router.post(
  '/login',
  validateAndHandle(AuthController.loginValidation),
  AuthController.login
);

// Refresh access token
router.post(
  '/refresh',
  validateAndHandle([
    body('refresh_token').notEmpty().withMessage('Refresh token is required')
  ]),
  AuthController.refresh
);

// User logout
router.post(
  '/logout',
  validateAndHandle([
    body('refresh_token').optional()
  ]),
  AuthController.logout
);

// Logout from all devices (requires authentication)
router.post(
  '/logout-all',
  authenticateToken,
  AuthController.logoutAll
);

// Get user profile (requires authentication)
router.get(
  '/profile',
  authenticateToken,
  AuthController.getProfile
);

// Change password (requires authentication)
router.put(
  '/change-password',
  authenticateToken,
  validateAndHandle([
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number')
  ]),
  AuthController.changePassword
);

export default router;