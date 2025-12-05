import { Injectable, Inject } from '@nestjs/common';
import { eq, and, desc, lt } from 'drizzle-orm';
import { DRIZZLE } from 'src/database/database.module';
import { DrizzleDB } from 'src/database/drizzle';
import { refreshTokens } from 'src/database/schema';
import {
  IRefreshTokenRepository,
} from 'src/common/interfaces/repository.interface';
import {
  IRefreshToken,
  ICreateRefreshToken,
} from 'src/common/interfaces/user.interface';

@Injectable()
export class DrizzleRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(data: ICreateRefreshToken): Promise<IRefreshToken> {
    const [token] = await this.db
      .insert(refreshTokens)
      .values({
        token: data.token,
        userId: data.userId,
        userAgent: data.userAgent || data.deviceInfo || 'Unknown Device',
        ipAddress: data.ipAddress || 'Unknown IP',
        expiresAt: data.expiresAt,
        isRevoked: false,
      })
      .returning();

    return this.mapToIRefreshToken(token);
  }

  async findValidTokensByUserId(userId: string): Promise<IRefreshToken[]> {
    const tokens = await this.db.query.refreshTokens.findMany({
      where: and(
        eq(refreshTokens.userId, userId),
        eq(refreshTokens.isRevoked, false),
      ),
    });

    // Filter out expired tokens
    const now = new Date();
    return tokens
      .filter((t) => t.expiresAt > now)
      .map((token) => this.mapToIRefreshToken(token));
  }

  async findAllByUserId(userId: string): Promise<IRefreshToken[]> {
    const tokens = await this.db.query.refreshTokens.findMany({
      where: eq(refreshTokens.userId, userId),
    });

    return tokens.map((token) => this.mapToIRefreshToken(token));
  }

  async update(id: string, data: Partial<IRefreshToken>): Promise<IRefreshToken> {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.token !== undefined) updateData.token = data.token;
    if (data.deviceInfo !== undefined) updateData.userAgent = data.deviceInfo;
    if (data.userAgent !== undefined) updateData.userAgent = data.userAgent;
    if (data.ipAddress !== undefined) updateData.ipAddress = data.ipAddress;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.isRevoked !== undefined) updateData.isRevoked = data.isRevoked;

    const [token] = await this.db
      .update(refreshTokens)
      .set(updateData)
      .where(eq(refreshTokens.id, id))
      .returning();

    return this.mapToIRefreshToken(token);
  }

  async revoke(id: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(eq(refreshTokens.id, id));
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ isRevoked: true, updatedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.isRevoked, false)));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.id, id));
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
  }

  async deleteExpiredByUserId(userId: string): Promise<void> {
    const now = new Date();
    const tokens = await this.db.query.refreshTokens.findMany({
      where: eq(refreshTokens.userId, userId),
    });

    for (const token of tokens) {
      if (token.isRevoked || token.expiresAt < now) {
        await this.db.delete(refreshTokens).where(eq(refreshTokens.id, token.id));
      }
    }
  }

  async keepRecentTokens(userId: string, keepCount: number): Promise<void> {
    const tokens = await this.db.query.refreshTokens.findMany({
      where: eq(refreshTokens.userId, userId),
      orderBy: [desc(refreshTokens.createdAt)],
    });

    // Delete tokens beyond keepCount
    const tokensToDelete = tokens.slice(keepCount);
    for (const token of tokensToDelete) {
      await this.db.delete(refreshTokens).where(eq(refreshTokens.id, token.id));
    }
  }

  private mapToIRefreshToken(token: any): IRefreshToken {
    return {
      id: token.id,
      token: token.token,
      userId: token.userId,
      userAgent: token.userAgent,
      deviceInfo: token.userAgent,
      ipAddress: token.ipAddress,
      expiresAt: token.expiresAt,
      isRevoked: token.isRevoked,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    };
  }
}
