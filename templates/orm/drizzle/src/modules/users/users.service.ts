import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { eq, ne, and, desc, count } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import { DRIZZLE } from '../../database/database.module';
import { DrizzleDB } from '../../database/drizzle';
import { users, refreshTokens, UserRole } from '../../database/schema';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { UpdateUserDto } from './dtos/update-user.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE) private db: DrizzleDB) {}

  async getProfile(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (updateProfileDto.fullName) updateData.fullName = updateProfileDto.fullName;

    const [updatedUser] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return this.sanitizeUser(updatedUser);
  }

  // Admin methods

  async getAllUsers(page: number = 1, limit: number = 10) {
    const offset = (page - 1) * limit;

    const [userList, totalResult] = await Promise.all([
      this.db.query.users.findMany({
        offset,
        limit,
        orderBy: [desc(users.createdAt)],
      }),
      this.db.select({ count: count() }).from(users),
    ]);

    const total = totalResult[0].count;
    const totalPages = Math.ceil(total / limit);

    return {
      data: userList.map((user) => this.sanitizeUser(user)),
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

    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return null;
    }

    return this.sanitizeUser(user);
  }

  async updateUserById(userId: string, updateUserDto: UpdateUserDto) {
    // Check if user exists
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (updateUserDto.fullName) updateData.fullName = updateUserDto.fullName;
    if (updateUserDto.role) updateData.role = updateUserDto.role as UserRole;
    if (updateUserDto.isActive !== undefined) updateData.isActive = updateUserDto.isActive;

    const [updatedUser] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    return this.sanitizeUser(updatedUser);
  }

  async deleteUserById(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Delete user's refresh tokens first
    await this.db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));

    // Delete user
    await this.db.delete(users).where(eq(users.id, userId));

    return { message: 'User deleted successfully' };
  }

  // Utils

  private sanitizeUser(user: any) {
    if (!user) {
      return null;
    }

    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
