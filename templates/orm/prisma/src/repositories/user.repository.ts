import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  IUserRepository,
} from 'src/common/interfaces/repository.interface';
import {
  IUser,
  ISafeUser,
  ICreateUser,
  IUpdateUser,
  IPaginatedResult,
  UserRole,
} from 'src/common/interfaces/user.interface';

@Injectable()
export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.mapToIUser(user) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    return user ? this.mapToIUser(user) : null;
  }

  async create(data: ICreateUser): Promise<IUser> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        fullName: data.fullName,
        role: data.role || UserRole.USER,
      },
    });

    return this.mapToIUser(user);
  }

  async update(id: string, data: IUpdateUser): Promise<IUser> {
    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });

    return this.mapToIUser(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.delete({
      where: { id },
    });
  }

  async findAll(page: number, limit: number): Promise<IPaginatedResult<ISafeUser>> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: users.map((user) => this.mapToISafeUser(user)),
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

  async count(filter?: { isActive?: boolean }): Promise<number> {
    return this.prisma.user.count({
      where: filter,
    });
  }

  private mapToIUser(user: any): IUser {
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      role: user.role as UserRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToISafeUser(user: any): ISafeUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
