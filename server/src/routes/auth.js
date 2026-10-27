import express from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { User } from '../models/index.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  display_name: z.string().min(1).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.issues });
    }

    const { email, password, display_name } = parseResult.data;
    const finalDisplayName = display_name || email.split('@')[0];

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const userRecord = await User.create({
      email,
      password_hash: passwordHash,
      display_name: finalDisplayName,
    });

    const user = {
      id: userRecord._id.toString(),
      email: userRecord.email,
      display_name: userRecord.display_name,
    };
    const token = generateToken(user);

    return res.status(201).json({ token, user });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Failed to register user' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: 'Validation failed', details: parseResult.error.issues });
    }

    const { email, password } = parseResult.data;

    const userRecord = await User.findOne({ email });
    if (!userRecord) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await bcrypt.compare(password, userRecord.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = {
      id: userRecord._id.toString(),
      email: userRecord.email,
      display_name: userRecord.display_name,
    };
    const token = generateToken(user);

    return res.json({ token, user });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Failed to authenticate user' });
  }
});

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userRecord = await User.findById(req.user.id).select('-password_hash');
    if (!userRecord) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      user: {
        id: userRecord._id.toString(),
        email: userRecord.email,
        display_name: userRecord.display_name,
        created_at: userRecord.created_at,
      },
    });
  } catch (err) {
    console.error('Auth me error:', err);
    return res.status(500).json({ error: 'Failed to retrieve user profile' });
  }
});

export default router;
