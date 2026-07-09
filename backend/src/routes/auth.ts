import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest, authMiddleware } from '../middleware/authMiddleware';
import { io } from '../server';

const prisma = new PrismaClient();
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'brgi_super_secret_token_key_12345';
const IS_DEV = process.env.NODE_ENV !== 'production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';


// ─── Mock in-memory users (fallback when DB offline) ─────────────────────────
const mockUsers: any[] = [
  {
    id: 'u_admin',
    email: 'admin@brgi.com',
    passwordHash: bcrypt.hashSync('admin123', 10),
    name: 'Administrator',
    role: 'ADMIN',
    status: 'ACTIVE',
    createdAt: new Date('2026-01-01'),
    resetToken: null,
    resetTokenExpiry: null,
  },
  {
    id: 'u_analyst',
    email: 'analyst@brgi.com',
    passwordHash: bcrypt.hashSync('analyst123', 10),
    name: 'Sarah Connor',
    role: 'ANALYST',
    status: 'ACTIVE',
    createdAt: new Date('2026-02-15'),
    resetToken: null,
    resetTokenExpiry: null,
  },
  {
    id: 'u_viewer',
    email: 'viewer@brgi.com',
    passwordHash: bcrypt.hashSync('viewer123', 10),
    name: 'John Doe',
    role: 'VIEWER',
    status: 'ACTIVE',
    createdAt: new Date('2026-03-10'),
    resetToken: null,
    resetTokenExpiry: null,
  },
];

export { mockUsers };

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { email, password, name, role, phone, company } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const roleValue = role || 'ANALYST';
  const hashedPassword = bcrypt.hashSync(password, 10);

  try {
    const user = await prisma.user.create({
      data: { email, passwordHash: hashedPassword, name, role: roleValue, phone, company },
    });
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET, { expiresIn: '7d' }
    );
    const safeUser = { id: user.id, email: user.email, role: user.role, name: user.name, phone: user.phone, company: user.company, status: user.status, createdAt: user.createdAt };
    // Broadcast new user to all admin clients in real-time
    try { io.emit('user:registered', safeUser); } catch {}
    return res.status(201).json({ token, user: safeUser });
  } catch (error: any) {
    if (error?.code === 'P2002') return res.status(400).json({ error: 'Email already exists' });
    // DB offline — mock fallback
    console.warn('[Auth] Prisma register failed. Using mock store.', error?.message);
    const userExists = mockUsers.find(u => u.email === email);
    if (userExists) return res.status(400).json({ error: 'Email already exists' });
    const newUser = { id: `u_${Date.now()}`, email, passwordHash: hashedPassword, name, role: roleValue, status: 'ACTIVE', phone: phone || null, company: company || null, createdAt: new Date(), resetToken: null, resetTokenExpiry: null };
    mockUsers.push(newUser);
    const token = jwt.sign({ id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name }, JWT_SECRET, { expiresIn: '7d' });
    const safeMockUser = { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name, phone: newUser.phone, company: newUser.company, status: newUser.status, createdAt: newUser.createdAt };
    // Broadcast new user to admin clients even in mock mode
    try { io.emit('user:registered', safeMockUser); } catch {}
    return res.status(201).json({ token, user: safeMockUser });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      if (user.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Your account has been suspended. Please contact an administrator.' });
      }
      
      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() }
      });

      const token = jwt.sign({ id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, name: updatedUser.name }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role, name: updatedUser.name, phone: updatedUser.phone, company: updatedUser.company } });
    }
  } catch (error) {
    console.warn('[Auth] Prisma login failed. Falling back to mock store.');
  }

  // Mock fallback
  const mockUser = mockUsers.find(u => u.email === email);
  if (mockUser && bcrypt.compareSync(password, mockUser.passwordHash)) {
    if (mockUser.status === 'SUSPENDED') {
      return res.status(403).json({ error: 'Your account has been suspended. Please contact an administrator.' });
    }
    mockUser.lastLogin = new Date();
    const token = jwt.sign({ id: mockUser.id, email: mockUser.email, role: mockUser.role, name: mockUser.name }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user: { id: mockUser.id, email: mockUser.email, role: mockUser.role, name: mockUser.name, phone: mockUser.phone, company: mockUser.company } });
  }

  return res.status(401).json({ error: 'Invalid email or password' });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /auth/me
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, role: true, status: true, phone: true, company: true, lastLogin: true, createdAt: true }
    });
    if (user) {
      if (user.status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Your account has been suspended.' });
      }
      return res.json({ user });
    }
  } catch {}
  return res.json({ user: req.user });
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /auth/profile  — Update name and/or change password (requires auth)
// ─────────────────────────────────────────────────────────────────────────────
router.put('/profile', authMiddleware, async (req: AuthenticatedRequest, res) => {
  const userId = req.user?.id;
  const { name, currentPassword, newPassword } = req.body;

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

  // Step 1: Find user
  let dbUser: any = null;
  let usingMock = false;
  try {
    dbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!dbUser) { dbUser = mockUsers.find(u => u.id === userId) || null; usingMock = !!dbUser; }
  } catch {
    dbUser = mockUsers.find(u => u.id === userId) || null;
    usingMock = true;
  }

  if (!dbUser) return res.status(404).json({ error: 'User not found.' });

  // Step 2: Validate current password
  if (newPassword && !bcrypt.compareSync(currentPassword, dbUser.passwordHash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }

  // Step 3: Build update payload
  const updateData: any = {};
  if (trimmedName) updateData.name = trimmedName;
  if (newPassword) updateData.passwordHash = bcrypt.hashSync(newPassword, 10);

  // Step 4: Persist
  if (usingMock) {
    if (trimmedName) dbUser.name = trimmedName;
    if (updateData.passwordHash) dbUser.passwordHash = updateData.passwordHash;
    const token = jwt.sign({ id: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.name }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, user: { id: dbUser.id, email: dbUser.email, role: dbUser.role, name: dbUser.name } });
  }

  try {
    const updated = await prisma.user.update({ where: { id: userId }, data: updateData });
    const token = jwt.sign({ id: updated.id, email: updated.email, role: updated.role, name: updated.name }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ success: true, token, user: { id: updated.id, email: updated.email, role: updated.role, name: updated.name } });
  } catch (dbErr: any) {
    console.error('[Auth] Prisma profile update error:', dbErr?.message);
    return res.status(500).json({ error: 'Database write failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /auth/forgot-password  — Update password directly if email exists
// ─────────────────────────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  const { email, newPassword } = req.body;
  if (!email) return res.status(400).json({ error: 'Email address is required.' });
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  // Step 1: Find and update user (Prisma first, then mock fallback)
  let updatedInDb = false;
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash: hashedPassword, resetToken: null, resetTokenExpiry: null },
      });
      updatedInDb = true;
    }
  } catch (error: any) {
    console.warn('[Auth] Prisma forgot-password failed. Falling back to mock store.', error?.message);
  }

  if (updatedInDb) {
    return res.json({ success: true, message: 'Password updated successfully. You can now log in with your new password.' });
  }

  // Step 2: Try to find in mockUsers list
  const mockUser = mockUsers.find(u => u.email === email);
  if (mockUser) {
    mockUser.passwordHash = hashedPassword;
    mockUser.resetToken = null;
    mockUser.resetTokenExpiry = null;
    return res.json({ success: true, message: 'Password updated successfully. You can now log in with your new password.' });
  }

  return res.status(404).json({ error: 'Email address not found.' });
});

export default router;

