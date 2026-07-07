import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, authMiddleware } from '../middleware/authMiddleware';

const prisma = new PrismaClient();
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'brgi_super_secret_token_key_12345';

// Mock in-memory users for zero-config fallback
const mockUsers: any[] = [
  {
    id: 'u_admin',
    email: 'admin@brgi.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    name: 'Administrator',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01')
  },
  {
    id: 'u_analyst',
    email: 'analyst@brgi.com',
    passwordHash: bcrypt.hashSync('analyst123', 10),
    name: 'Sarah Connor',
    role: 'ANALYST',
    status: 'ACTIVE',
    createdAt: new Date('2026-02-15')
  },
  {
    id: 'u_viewer',
    email: 'viewer@brgi.com',
    passwordHash: bcrypt.hashSync('viewer123', 10),
    name: 'John Doe',
    role: 'VIEWER',
    status: 'ACTIVE',
    createdAt: new Date('2026-03-10')
  }
];

export { mockUsers };

router.post('/register', async (req, res) => {
  const { email, password, name, role } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const roleValue = role || 'ANALYST';
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash: hashedPassword, name, role: roleValue }
    });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (error: any) {
    // Prisma unique constraint violation — email already exists in DB
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    // DB connection failure — fall back to mock in-memory store
    console.warn('[Auth] Prisma registration failed (connection). Using mock in-memory store.', error?.message);
    const userExists = mockUsers.find(u => u.email === email);
    if (userExists) return res.status(400).json({ error: 'Email already exists' });

    const newUser = {
      id: `u_${Date.now()}`,
      email, passwordHash: hashedPassword, name, role: roleValue,
      status: 'ACTIVE', createdAt: new Date()
    };
    mockUsers.push(newUser);
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
    return res.status(201).json({ token, user: { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name } });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  // 1. Try PostgreSQL first
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    }
    // User not found in DB — fall through to mock check
  } catch (error) {
    console.warn('[Auth] Prisma login failed (connection). Falling back to mock store.');
  }

  // 2. Fall back to mock store (demo accounts + offline-registered users)
  const mockUser = mockUsers.find(u => u.email === email);
  if (mockUser && bcrypt.compareSync(password, mockUser.passwordHash)) {
    const token = jwt.sign({ id: mockUser.id, email: mockUser.email, role: mockUser.role, name: mockUser.name }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: mockUser.id, email: mockUser.email, role: mockUser.role, name: mockUser.name } });
  }

  return res.status(401).json({ error: 'Invalid email or password' });
});

router.get('/me', authMiddleware, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

// Update profile (name and/or password)
router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const { name, currentPassword, newPassword } = req.body;

  // Validate: at least one field must be changing
  const trimmedName = name?.trim();
  if (!trimmedName && !newPassword) {
    return res.status(400).json({ error: 'Nothing to update. Provide a name or a new password.' });
  }
  if (trimmedName !== undefined && trimmedName.length < 2) {
    return res.status(400).json({ error: 'Name must be at least 2 characters.' });
  }
  if (newPassword && newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  if (newPassword && !currentPassword) {
    return res.status(400).json({ error: 'Current password is required to change password.' });
  }

  // ── Step 1: Find the user (Prisma first, mock fallback) ────────────────────
  let dbUser: any = null;
  let usingMock = false;

  try {
    dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) {
      // DB is live but user not found — check mocks (e.g. demo accounts)
      dbUser = mockUsers.find(u => u.id === userId) || null;
      usingMock = !!dbUser;
    }
  } catch {
    // DB offline — fall back to mock store
    dbUser = mockUsers.find(u => u.id === userId) || null;
    usingMock = true;
  }

  if (!dbUser) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // ── Step 2: Validate current password if changing password ─────────────────
  if (newPassword) {
    const passwordField = usingMock ? dbUser.passwordHash : dbUser.passwordHash;
    if (!bcrypt.compareSync(currentPassword, passwordField)) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
  }

  // ── Step 3: Build update payload ───────────────────────────────────────────
  const updateData: any = {};
  if (trimmedName) updateData.name = trimmedName;
  if (newPassword) updateData.passwordHash = bcrypt.hashSync(newPassword, 10);

  // ── Step 4: Persist changes ────────────────────────────────────────────────
  if (usingMock) {
    // Write to in-memory mock store
    if (trimmedName) dbUser.name = trimmedName;
    if (updateData.passwordHash) dbUser.passwordHash = updateData.passwordHash;
    const token = jwt.sign(
      { id: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.name },
      JWT_SECRET, { expiresIn: '7d' }
    );
    return res.json({
      success: true, token,
      user: { id: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.name }
    });
  }

  // Persist to PostgreSQL
  try {
    const updated = await prisma.user.update({ where: { id: userId }, data: updateData });
    const token = jwt.sign(
      { id: updated.id, email: updated.email, role: updated.role, name: updated.name },
      JWT_SECRET, { expiresIn: '7d' }
    );
    return res.json({
      success: true, token,
      user: { id: updated.id, email: updated.email, role: updated.role, name: updated.name }
    });
  } catch (dbErr: any) {
    console.error('[Auth] Prisma profile update error:', dbErr?.message);
    return res.status(500).json({ error: 'Database write failed. Please try again.' });
  }
});

export default router;
