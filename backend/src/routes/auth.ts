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
    console.warn('Prisma registration failed. Using mock in-memory store.');
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

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && bcrypt.compareSync(password, user.passwordHash)) {
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
    }
  } catch (error) {
    console.warn('Prisma login failed. Using mock store.');
  }

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

  if (!name && !newPassword) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  try {
    const updateData: any = {};
    if (name) updateData.name = name;
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required to change password' });
      // Try Prisma
      try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !bcrypt.compareSync(currentPassword, user.passwordHash)) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        updateData.passwordHash = bcrypt.hashSync(newPassword, 10);
      } catch {
        // Fallback to mock store
        const mockUser = mockUsers.find(u => u.id === userId);
        if (!mockUser || !bcrypt.compareSync(currentPassword, mockUser.passwordHash)) {
          return res.status(400).json({ error: 'Current password is incorrect' });
        }
        if (name) mockUser.name = name;
        if (newPassword) mockUser.passwordHash = bcrypt.hashSync(newPassword, 10);
        return res.json({ success: true, user: { id: mockUser.id, email: mockUser.email, role: mockUser.role, name: mockUser.name } });
      }
    }

    try {
      const updated = await prisma.user.update({ where: { id: userId }, data: updateData });
      const token = jwt.sign({ id: updated.id, email: updated.email, role: updated.role, name: updated.name }, JWT_SECRET, { expiresIn: '7d' });
      return res.json({ success: true, token, user: { id: updated.id, email: updated.email, role: updated.role, name: updated.name } });
    } catch {
      // Fallback
      const mockUser = mockUsers.find(u => u.id === userId);
      if (mockUser) {
        if (name) mockUser.name = name;
        if (updateData.passwordHash) mockUser.passwordHash = updateData.passwordHash;
        const token = jwt.sign({ id: mockUser.id, email: mockUser.email, role: mockUser.role, name: mockUser.name }, JWT_SECRET, { expiresIn: '7d' });
        return res.json({ success: true, token, user: { id: mockUser.id, email: mockUser.email, role: mockUser.role, name: mockUser.name } });
      }
      return res.status(404).json({ error: 'User not found' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
