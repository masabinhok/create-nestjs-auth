/**
 * User entity interface - ORM agnostic
 */
export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Safe user data (without sensitive fields)
 */
export interface ISafeUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User roles enum
 */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

/**
 * Refresh token entity interface
 */
export interface IRefreshToken {
  id: string;
  token: string;
  userId: string;
  deviceInfo?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  isRevoked?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create user data
 */
export interface ICreateUser {
  email: string;
  passwordHash: string;
  fullName: string;
  role?: UserRole;
}

/**
 * Update user data
 */
export interface IUpdateUser {
  email?: string;
  passwordHash?: string;
  fullName?: string;
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Create refresh token data
 */
export interface ICreateRefreshToken {
  token: string;
  userId: string;
  deviceInfo?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

/**
 * Paginated result
 */
export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
