import { createHash } from 'node:crypto';
import { db } from '../db/index';
import { apiKeys } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export interface VerifiedKey {
  userId: string;
  keyId: string;
  usageCount: number;
}

export async function verifyApiKey(request: Request): Promise<VerifiedKey | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const rawKey = authHeader.slice(7).trim();
  if (!rawKey) return null;

  const keyHash = createHash('sha256').update(rawKey).digest('hex');

  const [row] = await db
    .select()
    .from(apiKeys)
    .where(and(eq(apiKeys.keyHash, keyHash), isNull(apiKeys.revokedAt)))
    .limit(1);

  if (!row) return null;
  return { userId: row.userId, keyId: row.id, usageCount: row.usageCount };
}
