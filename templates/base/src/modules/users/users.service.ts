import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import {
  IUserRepository,
  IRefreshTokenRepository,
  USER_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
} from 'src/common/interfaces/repository.interface';
import { IUser, ISafeUser } from 'src/common/interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
  ) {}

  async getProfile(userId: string): Promise<ISafeUser | null> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<ISafeUser | null> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepository.update(userId, {
      fullName: updateProfileDto.fullName,
    });

    return this.sanitizeUser(updatedUser);
  }

  // Admin methods

  async getAllUsers(page: number = 1, limit: number = 10) {
    return this.userRepository.findAll(page, limit);
  }

  async getUserById(userId: string): Promise<ISafeUser | null> {
    if (!userId) {
      return null;
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  async updateUserById(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<ISafeUser | null> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = await this.userRepository.update(userId, {
      fullName: updateUserDto.fullName,
      role: updateUserDto.role,
      isActive: updateUserDto.isActive,
    });

    return this.sanitizeUser(updatedUser);
  }

  async deleteUserById(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Soft delete: set isActive to false
    await this.userRepository.softDelete(userId);

    // Invalidate all refresh tokens for this user
    await this.refreshTokenRepository.deleteAllByUserId(userId);

    return { message: 'User deleted successfully' };
  }

  // Utils

  private sanitizeUser(user: IUser | null): ISafeUser | null {
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
