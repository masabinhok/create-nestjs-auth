import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import { RefreshToken } from 'src/entities/refresh-token.entity';
import {
  IRefreshTokenRepository,
} from 'src/common/interfaces/repository.interface';
import {
  IRefreshToken,
  ICreateRefreshToken,
} from 'src/common/interfaces/user.interface';

@Injectable()
export class TypeOrmRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async create(data: ICreateRefreshToken): Promise<IRefreshToken> {
    const token = this.refreshTokenRepository.create({
      token: data.token,
      userId: data.userId,
      deviceInfo: data.deviceInfo || data.userAgent || 'Unknown Device',
      ipAddress: data.ipAddress || 'Unknown IP',
      expiresAt: data.expiresAt,
    });

    const savedToken = await this.refreshTokenRepository.save(token);
    return this.mapToIRefreshToken(savedToken);
  }

  async findValidTokensByUserId(userId: string): Promise<IRefreshToken[]> {
    const tokens = await this.refreshTokenRepository.find({
      where: {
        userId,
        expiresAt: MoreThanOrEqual(new Date()),
      },
    });

    return tokens.map((token) => this.mapToIRefreshToken(token));
  }

  async findAllByUserId(userId: string): Promise<IRefreshToken[]> {
    const tokens = await this.refreshTokenRepository.find({
      where: { userId },
    });

    return tokens.map((token) => this.mapToIRefreshToken(token));
  }

  async update(id: string, data: Partial<IRefreshToken>): Promise<IRefreshToken> {
    const updateData: Partial<RefreshToken> = {};
    if (data.token !== undefined) updateData.token = data.token;
    if (data.deviceInfo !== undefined) updateData.deviceInfo = data.deviceInfo;
    if (data.ipAddress !== undefined) updateData.ipAddress = data.ipAddress;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

    await this.refreshTokenRepository.update(id, updateData);

    const token = await this.refreshTokenRepository.findOne({ where: { id } });
    return this.mapToIRefreshToken(token!);
  }

  async revoke(id: string): Promise<void> {
    await this.refreshTokenRepository.delete(id);
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  async delete(id: string): Promise<void> {
    await this.refreshTokenRepository.delete(id);
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.refreshTokenRepository.delete({ userId });
  }

  async deleteExpiredByUserId(userId: string): Promise<void> {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('userId = :userId AND expiresAt < :now', {
        userId,
        now: new Date(),
      })
      .execute();
  }

  async keepRecentTokens(userId: string, keepCount: number): Promise<void> {
    const tokens = await this.refreshTokenRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: keepCount,
      take: 100,
    });

    if (tokens.length > 0) {
      await this.refreshTokenRepository.delete({
        id: In(tokens.map((t) => t.id)),
      });
    }
  }

  private mapToIRefreshToken(token: RefreshToken): IRefreshToken {
    return {
      id: token.id,
      token: token.token,
      userId: token.userId,
      deviceInfo: token.deviceInfo || undefined,
      ipAddress: token.ipAddress || undefined,
      expiresAt: token.expiresAt,
      createdAt: token.createdAt,
      updatedAt: token.updatedAt,
    };
  }
}
