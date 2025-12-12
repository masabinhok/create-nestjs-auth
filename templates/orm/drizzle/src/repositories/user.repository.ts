import { Injectable, Inject } from '@nestjs/common';
import { eq, desc, sql } from 'drizzle-orm';
import { DRIZZLE } from 'src/database/database.module';
import { DrizzleDB } from 'src/database/drizzle';
import { users } from 'src/database/schema';
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
export class DrizzleUserRepository implements IUserRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string): Promise<IUser | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, id),
    });

    return user ? this.mapToIUser(user) : null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const user = await this.db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    return user ? this.mapToIUser(user) : null;
  }

  async create(data: ICreateUser): Promise<IUser> {
    const [user] = await this.db
      .insert(users)
      .values({
        fullName: data.fullName,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        role: (data.role as 'USER' | 'ADMIN') || 'USER',
        isActive: true,
      })
      .returning();

    return this.mapToIUser(user);
  }

  async update(id: string, data: IUpdateUser): Promise<IUser> {
    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.passwordHash !== undefined) updateData.passwordHash = data.passwordHash;
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.role !== undefined) updateData.role = data.role as 'USER' | 'ADMIN';
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const [user] = await this.db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return this.mapToIUser(user);
  }

  async softDelete(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }

  async findAll(page: number, limit: number): Promise<IPaginatedResult<ISafeUser>> {
    const offset = (page - 1) * limit;

    const [userList, countResult] = await Promise.all([
      this.db.query.users.findMany({
        offset,
        limit,
        orderBy: [desc(users.createdAt)],
        where: eq(users.isActive, true),
      }),
      this.db
        .select({ count: sql`count(*)` })
        .from(users)
        .where(eq(users.isActive, true)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: userList.map((user) => this.mapToISafeUser(user)),
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
    let query = this.db.select({ count: sql`count(*)` }).from(users);

    if (filter?.isActive !== undefined) {
      query = query.where(eq(users.isActive, filter.isActive));
    }

    const result = await query;
    return Number(result[0]?.count ?? 0);
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
