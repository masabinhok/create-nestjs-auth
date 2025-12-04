import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/entities/user.entity';
import { RefreshToken } from 'src/entities/refresh-token.entity';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    await this.userRepository.update(userId, updateProfileDto);
    
    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.sanitizeUser(updatedUser);
  }

  async getAllUsers(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      where: { isActive: true },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    const sanitizedUsers = users.map((user) => this.sanitizeUser(user));
    const totalPages = Math.ceil(total / limit);

    return {
      data: sanitizedUsers,
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

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  async updateUserById(userId: string, updateUserDto: UpdateUserDto) {
    await this.userRepository.update(userId, updateUserDto);

    const updatedUser = await this.userRepository.findOne({
      where: { id: userId },
    });

    return this.sanitizeUser(updatedUser);
  }

  async deleteUserById(userId: string) {
    // Soft delete: set isActive to false
    await this.userRepository.update(userId, { isActive: false });

    // Invalidate all refresh tokens for this user
    await this.refreshTokenRepository.delete({ userId });

    return { message: 'User deleted successfully' };
  }

  // Utils

  sanitizeUser(user: User | null) {
    if (!user) {
      return null;
    }

    const { refreshToken, passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
