import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { queryOne, User } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'deliket-dev-secret-key';
const TOKEN_COOKIE = 'deliket_token';

export interface AuthPayload {
  userId: number;
  email?: string;
}

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE)?.value;
  
  if (!token) return null;
  
  const payload = verifyToken(token);
  if (!payload) return null;
  
  return await queryOne<User>(
    'SELECT id, name, email, phone, role, rating, is_admin, is_verified, xp, level, trust_score, created_at FROM users WHERE id = $1 AND is_active = true',
    [payload.userId]
  );
}

export async function getUserByToken(token: string): Promise<User | null> {
  const payload = verifyToken(token);
  if (!payload) return null;
  
  return await queryOne<User>(
    'SELECT id, name, email, phone, role, rating, is_admin, is_verified, xp, level, trust_score, created_at FROM users WHERE id = $1 AND is_active = true',
    [payload.userId]
  );
}

// PBKDF2-SHA256 (compatible with Python's hashlib.pbkdf2_hmac)
export function verifyPbkdf2(password: string, stored: string): boolean {
  try {
    const [saltHex, keyHex] = stored.split(':');
    const salt = Buffer.from(saltHex, 'hex');
    const expectedKey = Buffer.from(keyHex, 'hex');
    const derivedKey = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
    return crypto.timingSafeEqual(derivedKey, expectedKey);
  } catch { return false; }
}

export function hashPbkdf2(password: string): string {
  const salt = crypto.randomBytes(32);
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return salt.toString('hex') + ':' + key.toString('hex');
}

export async function generateAuthToken(): Promise<string> {
  const { randomBytes } = await import('crypto');
  return randomBytes(32).toString('hex');
}

export { TOKEN_COOKIE, JWT_SECRET };
