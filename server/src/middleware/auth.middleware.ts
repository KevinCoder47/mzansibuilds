import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request so we can attach the developer's id to it
export interface AuthRequest extends Request {
  developerId?: string;
}

/**
 * Protect a route — only logged-in developers can access it.
 * Usage: router.get('/profile', protect, getProfile)
 */
export const protect = (req: AuthRequest, res: Response, next: NextFunction): void => {
  // Token should come in as: Authorization: Bearer <token>
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Not logged in. Please provide a token.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify the token — throws if invalid or expired
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret') as { id: string };

    // Attach the developer's id to the request for use in route handlers
    req.developerId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: 'Token is invalid or has expired.' });
  }
};
