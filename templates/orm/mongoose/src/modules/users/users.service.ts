import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, UserRole } from '../../schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from '../../schemas/refresh-token.schema';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userModel.findById(userId).select('-passwordHash');
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        email: updateProfileDto.email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash new password if provided
    let passwordHash: string | undefined;
    if (updateProfileDto.password) {
      passwordHash = await bcrypt.hash(updateProfileDto.password, SALT_ROUNDS);
    }

    const updateData: any = {};
    if (updateProfileDto.fullName) updateData.fullName = updateProfileDto.fullName;
    if (updateProfileDto.email) updateData.email = updateProfileDto.email.toLowerCase();
    if (passwordHash) updateData.passwordHash = passwordHash;

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-passwordHash');

    return this.sanitizeUser(updatedUser);
  }

  // Admin methods

  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [usersList, total] = await Promise.all([
      this.userModel
        .find()
        .select('-passwordHash')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.userModel.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: usersList.map((user) => this.sanitizeUser(user)),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async getUserById(userId: string) {
    if (!userId) {
      return null;
    }

    const user = await this.userModel.findById(userId).select('-passwordHash');
    if (!user) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  async updateUserById(userId: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.userModel.findOne({
        email: updateUserDto.email.toLowerCase(),
        _id: { $ne: userId },
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash new password if provided
    let passwordHash: string | undefined;
    if (updateUserDto.password) {
      passwordHash = await bcrypt.hash(updateUserDto.password, SALT_ROUNDS);
    }

    const updateData: any = {};
    if (updateUserDto.fullName) updateData.fullName = updateUserDto.fullName;
    if (updateUserDto.email) updateData.email = updateUserDto.email.toLowerCase();
    if (updateUserDto.role) updateData.role = updateUserDto.role;
    if (updateUserDto.isActive !== undefined) updateData.isActive = updateUserDto.isActive;
    if (passwordHash) updateData.passwordHash = passwordHash;

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, updateData, { new: true })
      .select('-passwordHash');

    return this.sanitizeUser(updatedUser);
  }

  async deleteUserById(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user's refresh tokens
    await this.refreshTokenModel.deleteMany({ userId });

    // Delete user
    await this.userModel.findByIdAndDelete(userId);

    return { message: 'User deleted successfully' };
  }

  // Utils

  private sanitizeUser(user: UserDocument | null) {
    if (!user) {
      return null;
    }

    return {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
