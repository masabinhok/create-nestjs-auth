import {
  Injectable,
  Inject,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import * as bcrypt from 'bcrypt';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import {
  IUserRepository,
  IRefreshTokenRepository,
  USER_REPOSITORY,
  REFRESH_TOKEN_REPOSITORY,
} from 'src/common/interfaces/repository.interface';
import { IUser, UserRole } from 'src/common/interfaces/user.interface';

const SALT_ROUNDS = 12;
const MAX_TOKENS_PER_USER = 5;

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: IRefreshTokenRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, fullName } = signupDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(email.toLowerCase());
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    // Hash password and create user
    const passwordHash = await this.hashData(password);
    const newUser = await this.userRepository.create({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role: UserRole.USER,
    });

    // Log without PII (email address)
    this.logger.log({
      message: 'New user registered',
      userId: newUser.id,
      role: newUser.role,
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        role: newUser.role,
      },
      message: 'User registered successfully',
    };
  }

  async login(loginDto: LoginDto, deviceInfo?: string, ipAddress?: string) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findByEmail(email.toLowerCase());

    // Prevent timing attacks by always hashing, even if user doesn't exist
    const passwordHash =
      user?.passwordHash ||
      (await this.hashData('dummy-password-to-prevent-timing-attack'));
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    // Use consistent error message to prevent account enumeration
    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store hashed refresh token
    const hashedRt = await this.hashData(tokens.refreshToken);
    const expiresAt = this.calculateExpiry(
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d',
    );

    await this.refreshTokenRepository.create({
      token: hashedRt,
      userId: user.id,
      deviceInfo: deviceInfo || 'Unknown Device',
      ipAddress: ipAddress || 'Unknown IP',
      expiresAt,
    });

    // Clean up expired tokens for this user
    await this.cleanupExpiredTokens(user.id);

    this.logger.log({
      message: 'User logged in',
      userId: user.id,
      role: user.role,
      timestamp: new Date().toISOString(),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(
    userId: string,
    rt: string,
    deviceInfo?: string,
    ipAddress?: string,
  ) {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.isActive) {
      throw new ForbiddenException('Invalid refresh token');
    }

    // Find matching refresh token in database
    const storedTokens = await this.refreshTokenRepository.findValidTokensByUserId(user.id);

    let validTokenId: string | null = null;

    // Check if provided token matches any stored token
    for (const storedToken of storedTokens) {
      const matches = await bcrypt.compare(rt, storedToken.token);
      if (matches) {
        validTokenId = storedToken.id;
        break;
      }
    }

    if (!validTokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(user);
    const hashedRt = await this.hashData(tokens.refreshToken);
    const expiresAt = this.calculateExpiry(
      this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d',
    );

    // Update the refresh token (rotation)
    await this.refreshTokenRepository.update(validTokenId, {
      token: hashedRt,
      deviceInfo: deviceInfo || 'Unknown Device',
      ipAddress: ipAddress || 'Unknown IP',
      expiresAt,
      updatedAt: new Date(),
    });

    return tokens;
  }

  async logout(userId: string, rt?: string) {
    if (rt) {
      // Find and delete the specific refresh token
      const storedTokens = await this.refreshTokenRepository.findAllByUserId(userId);

      for (const storedToken of storedTokens) {
        const matches = await bcrypt.compare(rt, storedToken.token);
        if (matches) {
          await this.refreshTokenRepository.delete(storedToken.id);
          break;
        }
      }
    } else {
      // Logout from all devices
      await this.refreshTokenRepository.deleteAllByUserId(userId);
    }

    return {
      message: 'Logged out successfully',
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }

  // Helper Methods

  async hashData(data: string): Promise<string> {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(data, salt);
  }

  async generateTokens(
    user: IUser,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessExpiry = this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m';
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiry,
      } as any),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiry,
      } as any),
    ]);

    return { accessToken, refreshToken };
  }

  private async cleanupExpiredTokens(userId: string) {
    // Remove expired refresh tokens for this user
    await this.refreshTokenRepository.deleteExpiredByUserId(userId);

    // Keep only the N most recent tokens per user
    await this.refreshTokenRepository.keepRecentTokens(userId, MAX_TOKENS_PER_USER);
  }

  private calculateExpiry(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }
}
