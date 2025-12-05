import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  IRefreshTokenRepository,
} from 'src/common/interfaces/repository.interface';
import {
  IRefreshToken,
  ICreateRefreshToken,
} from 'src/common/interfaces/user.interface';

@Injectable()
export class PrismaRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateRefreshToken): Promise<IRefreshToken> {
    const token = await this.prisma.refreshToken.create({
      data: {
        token: data.token,
        userId: data.userId,
        deviceInfo: data.deviceInfo || 'Unknown Device',
        ipAddress: data.ipAddress || 'Unknown IP',
        expiresAt: data.expiresAt,
      },
    });

    return this.mapToIRefreshToken(token);
  }

  async findValidTokensByUserId(userId: string): Promise<IRefreshToken[]> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        expiresAt: { gte: new Date() },
      },
    });

    return tokens.map((token) => this.mapToIRefreshToken(token));
  }

  async findAllByUserId(userId: string): Promise<IRefreshToken[]> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
    });

    return tokens.map((token) => this.mapToIRefreshToken(token));
  }

  async update(id: string, data: Partial<IRefreshToken>): Promise<IRefreshToken> {
    const updateData: any = {};
    if (data.token !== undefined) updateData.token = data.token;
    if (data.deviceInfo !== undefined) updateData.deviceInfo = data.deviceInfo;
    if (data.ipAddress !== undefined) updateData.ipAddress = data.ipAddress;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.updatedAt !== undefined) updateData.updatedAt = data.updatedAt;

    const token = await this.prisma.refreshToken.update({
      where: { id },
      data: updateData,
    });

    return this.mapToIRefreshToken(token);
  }

  async revoke(id: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { id },
    });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { id },
    });
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async deleteExpiredByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId,
        expiresAt: { lt: new Date() },
      },
    });
  }

  async keepRecentTokens(userId: string, keepCount: number): Promise<void> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: keepCount,
      take: 100,
    });

    if (tokens.length > 0) {
      await this.prisma.refreshToken.deleteMany({
        where: {
          id: { in: tokens.map((t) => t.id) },
        },
      });
    }
  }

  private mapToIRefreshToken(token: any): IRefreshToken {
    return {
      id: token.id,
      token: token.token,
      userId: token.userId,
      deviceInfo: token.deviceInfo,
      ipAddress: token.ipAddress,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    };
  }
}
