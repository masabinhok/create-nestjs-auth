/**
 * Repository interfaces for decoupled storage layer
 * These interfaces define the contract that all ORM implementations must follow
 */

import {
  IUser,
  ISafeUser,
  ICreateUser,
  IUpdateUser,
  IRefreshToken,
  ICreateRefreshToken,
  IPaginatedResult,
} from './user.interface';

/**
 * Repository injection tokens
 */
export const USER_REPOSITORY = 'USER_REPOSITORY';
export const REFRESH_TOKEN_REPOSITORY = 'REFRESH_TOKEN_REPOSITORY';

/**
 * User repository interface
 * All ORM implementations must implement these methods
 */
export interface IUserRepository {
  /**
   * Find a user by their unique ID
   */
  findById(id: string): Promise<IUser | null>;

  /**
   * Find a user by their email address
   */
  findByEmail(email: string): Promise<IUser | null>;

  /**
   * Create a new user
   */
  create(data: ICreateUser): Promise<IUser>;

  /**
   * Update an existing user
   */
  update(id: string, data: IUpdateUser): Promise<IUser>;

  /**
   * Soft delete a user (set isActive to false)
   */
  softDelete(id: string): Promise<void>;

  /**
   * Hard delete a user (remove from database)
   */
  delete(id: string): Promise<void>;

  /**
   * Get paginated list of users
   */
  findAll(page: number, limit: number): Promise<IPaginatedResult<ISafeUser>>;

  /**
   * Count total users
   */
  count(filter?: { isActive?: boolean }): Promise<number>;
}

/**
 * Refresh token repository interface
 * All ORM implementations must implement these methods
 */
export interface IRefreshTokenRepository {
  /**
   * Create a new refresh token
   */
  create(data: ICreateRefreshToken): Promise<IRefreshToken>;

  /**
   * Find all tokens for a user that haven't expired
   */
  findValidTokensByUserId(userId: string): Promise<IRefreshToken[]>;

  /**
   * Find all tokens for a user (including expired/revoked)
   */
  findAllByUserId(userId: string): Promise<IRefreshToken[]>;

  /**
   * Update a refresh token by ID
   */
  update(id: string, data: Partial<IRefreshToken>): Promise<IRefreshToken>;

  /**
   * Revoke a specific token by ID
   */
  revoke(id: string): Promise<void>;

  /**
   * Revoke all tokens for a user
   */
  revokeAllByUserId(userId: string): Promise<void>;

  /**
   * Delete a token by ID
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all tokens for a user
   */
  deleteAllByUserId(userId: string): Promise<void>;

  /**
   * Delete expired tokens for a user
   */
  deleteExpiredByUserId(userId: string): Promise<void>;

  /**
   * Keep only the N most recent tokens for a user
   */
  keepRecentTokens(userId: string, keepCount: number): Promise<void>;
}
