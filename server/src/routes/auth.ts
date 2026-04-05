import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { addUser, findUserByEmail } from '../data/store';

const router = Router();

// ─── Validation schemas (Zod) ─────────────────────────────────────────────────

const registerSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

// ─── Helper: create a JWT token ───────────────────────────────────────────────

const createToken = (developerId: string): string => {
  return jwt.sign({ id: developerId }, process.env.JWT_SECRET || 'dev_secret', {
    expiresIn: '15m',
  });
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    // ✅ Fixed: Zod v4 uses .issues instead of .errors
    const firstError = result.error.issues[0].message;
    res.status(400).json({ error: firstError });
    return;
  }

  const { username, email, password } = result.data;

  const existing = findUserByEmail(email);
  if (existing) {
    res.status(400).json({ error: 'Email already in use' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const newDeveloper = {
    id: uuidv4(),
    username,
    email,
    passwordHash,
    bio: '',
    avatarUrl: '',
    createdAt: new Date().toISOString(),
  };

  addUser(newDeveloper);

  const token = createToken(newDeveloper.id);

  res.status(201).json({
    message: 'Account created successfully',
    token,
    developer: {
      id: newDeveloper.id,
      username: newDeveloper.username,
      email: newDeveloper.email,
    },
  });
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    // ✅ Fixed: Zod v4 uses .issues instead of .errors
    const firstError = result.error.issues[0].message;
    res.status(400).json({ error: firstError });
    return;
  }

  const { email, password } = result.data;

  const developer = findUserByEmail(email);
  if (!developer) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const passwordMatch = await bcrypt.compare(password, developer.passwordHash);
  if (!passwordMatch) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = createToken(developer.id);

  res.status(200).json({
    token,
    developer: {
      id: developer.id,
      username: developer.username,
      email: developer.email,
    },
  });
});

export default router;
