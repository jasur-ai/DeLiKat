import { Pool } from 'pg';

const globalForPool = globalThis as typeof globalThis & { pool?: Pool };

const pool = globalForPool.pool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

if (process.env.NODE_ENV !== 'production') globalForPool.pool = pool;

export interface User {
  id: number;
  username?: string;
  phone?: string;
  name: string;
  email?: string;
  role?: string;
  rating: number;
  is_admin: boolean;
  is_verified: boolean;
  xp: number;
  level: number;
  trust_score: number;
  created_at: string;
}

export interface Lot {
  id: number;
  seller_id: number;
  category: string;
  title: string;
  description?: string;
  quantity: number;
  price: number;
  grade: string;
  status: string;
  image_file_id?: string;
  created_at: string;
  view_count: number;
  bid_count: number;
  seller_name?: string;
  seller_rating?: number;
}

export interface Bid {
  id: number;
  lot_id: number;
  buyer_id: number;
  price: number;
  quantity: number;
  status: string;
  created_at: string;
}

export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  total?: number;
  limit?: number;
  offset?: number;
}

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } catch (err) {
    console.error('DB query error:', err);
    throw err;
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

export async function execute(text: string, params?: any[]): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result.rowCount || 0;
  } finally {
    client.release();
  }
}

export default pool;
