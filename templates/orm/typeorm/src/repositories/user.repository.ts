import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole as TypeOrmUserRole } from 'src/entities/user.entity';
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
export class TypeOrmUserRepository implements IUserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<IUser | null> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    return user ? this.mapToIUser(user) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    return user ? this.mapToIUser(user) : null;
  }

  async create(data: ICreateUser): Promise<IUser> {
    const user = this.userRepository.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      role: (data.role as TypeOrmUserRole) || TypeOrmUserRole.USER,
    });

    const savedUser = await this.userRepository.save(user);
    return this.mapToIUser(savedUser);
  }

  async update(id: string, data: IUpdateUser): Promise<IUser> {
    const updateData: Partial<User> = {};
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.role !== undefined) updateData.role = data.role as TypeOrmUserRole;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    await this.userRepository.update(id, updateData);

    const user = await this.userRepository.findOne({ where: { id } });
    return this.mapToIUser(user!);
  }

  async softDelete(id: string): Promise<void> {
    await this.userRepository.update(id, { isActive: false });
  }

  async delete(id: string): Promise<void> {
    await this.userRepository.delete(id);
  }

  async findAll(page: number, limit: number): Promise<IPaginatedResult<ISafeUser>> {
    const skip = (page - 1) * limit;

    const [users, total] = await this.userRepository.findAndCount({
      where: { isActive: true },
      skip,
      take: limit,
      order: { createdAt: 'DESC' },
    });

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
    return this.userRepository.count({
      where: filter,
    });
  }

  private mapToIUser(user: User): IUser {
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

  private mapToISafeUser(user: User): ISafeUser {
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
