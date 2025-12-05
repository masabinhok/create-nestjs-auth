import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole as MongooseUserRole } from 'src/schemas/user.schema';
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
export class MongooseUserRepository implements IUserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findById(id: string): Promise<IUser | null> {
    const user = await this.userModel.findById(id);
    return user ? this.mapToIUser(user) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    return user ? this.mapToIUser(user) : null;
  }

  async create(data: ICreateUser): Promise<IUser> {
    const user = await this.userModel.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      role: (data.role as MongooseUserRole) || MongooseUserRole.USER,
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

    const user = await this.userModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true },
    );

    return this.mapToIUser(user!);
  }

  async softDelete(id: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(id, { isActive: false });
  }

  async delete(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id);
  }

  async findAll(page: number, limit: number): Promise<IPaginatedResult<ISafeUser>> {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find({ isActive: true })
        .select('-passwordHash')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.userModel.countDocuments({ isActive: true }),
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
    return this.userModel.countDocuments(filter);
  }

  private mapToIUser(user: UserDocument): IUser {
    return {
      id: user._id.toString(),
      email: user.email,
      passwordHash: user.passwordHash,
      fullName: user.fullName,
      role: user.role as UserRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private mapToISafeUser(user: UserDocument): ISafeUser {
    return {
      id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      role: user.role as UserRole,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
