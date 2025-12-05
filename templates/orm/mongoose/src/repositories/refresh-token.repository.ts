import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RefreshToken, RefreshTokenDocument } from 'src/schemas/refresh-token.schema';
import {
  IRefreshTokenRepository,
} from 'src/common/interfaces/repository.interface';
import {
  IRefreshToken,
  ICreateRefreshToken,
} from 'src/common/interfaces/user.interface';

@Injectable()
export class MongooseRefreshTokenRepository implements IRefreshTokenRepository {
  constructor(
    @InjectModel(RefreshToken.name)
    private readonly refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async create(data: ICreateRefreshToken): Promise<IRefreshToken> {
    const token = await this.refreshTokenModel.create({
      token: data.token,
      userId: data.userId,
      userAgent: data.userAgent || data.deviceInfo || 'Unknown Device',
      ipAddress: data.ipAddress || 'Unknown IP',
      expiresAt: data.expiresAt,
      isRevoked: false,
    });

    return this.mapToIRefreshToken(token);
  }

  async findValidTokensByUserId(userId: string): Promise<IRefreshToken[]> {
    const tokens = await this.refreshTokenModel.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    return tokens.map((token) => this.mapToIRefreshToken(token));
  }

  async findAllByUserId(userId: string): Promise<IRefreshToken[]> {
    const tokens = await this.refreshTokenModel.find({ userId });
    return tokens.map((token) => this.mapToIRefreshToken(token));
  }

  async update(id: string, data: Partial<IRefreshToken>): Promise<IRefreshToken> {
    const updateData: any = {};
    if (data.token !== undefined) updateData.token = data.token;
    if (data.deviceInfo !== undefined) updateData.userAgent = data.deviceInfo;
    if (data.userAgent !== undefined) updateData.userAgent = data.userAgent;
    if (data.ipAddress !== undefined) updateData.ipAddress = data.ipAddress;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;
    if (data.isRevoked !== undefined) updateData.isRevoked = data.isRevoked;

    const token = await this.refreshTokenModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );

    return this.mapToIRefreshToken(token!);
  }

  async revoke(id: string): Promise<void> {
    await this.refreshTokenModel.findByIdAndUpdate(id, { isRevoked: true });
  }

  async revokeAllByUserId(userId: string): Promise<void> {
    await this.refreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async delete(id: string): Promise<void> {
    await this.refreshTokenModel.findByIdAndDelete(id);
  }

  async deleteAllByUserId(userId: string): Promise<void> {
    await this.refreshTokenModel.deleteMany({ userId });
  }

  async deleteExpiredByUserId(userId: string): Promise<void> {
    await this.refreshTokenModel.deleteMany({
      userId,
      $or: [
        { isRevoked: true },
        { expiresAt: { $lt: new Date() } },
      ],
    });
  }

  async keepRecentTokens(userId: string, keepCount: number): Promise<void> {
    const tokens = await this.refreshTokenModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(keepCount);

    const tokenIds = tokens.map((t) => t._id);
    if (tokenIds.length > 0) {
      await this.refreshTokenModel.deleteMany({ _id: { $in: tokenIds } });
    }
  }

  private mapToIRefreshToken(token: RefreshTokenDocument): IRefreshToken {
    return {
      id: token._id.toString(),
      token: token.token,
      userId: token.userId.toString(),
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
