import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument, Role } from '../../schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from '../../schemas/refresh-token.schema';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await this.userModel.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: Role.USER,
    });

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  async login(loginDto: LoginDto, deviceInfo?: string, ipAddress?: string) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Store refresh token in database
    await this.storeRefreshToken(
      tokens.refreshToken,
      user._id.toString(),
      deviceInfo || 'Unknown Device',
      ipAddress || 'Unknown IP',
    );

    // Clean up expired tokens for this user
    await this.cleanupExpiredTokens(user._id.toString());

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      ...tokens,
    };
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      // Find and revoke the specific refresh token by comparing hashes
      const storedTokens = await this.refreshTokenModel.find({ userId });

      for (const storedToken of storedTokens) {
        const matches = await bcrypt.compare(refreshToken, storedToken.token);
        if (matches) {
          await this.refreshTokenModel.updateOne(
            { _id: storedToken._id },
            { isRevoked: true },
          );
          break;
        }
      }
    } else {
      // Logout from all devices - revoke all refresh tokens for this user
      await this.refreshTokenModel.updateMany(
        { userId, isRevoked: false },
        { isRevoked: true },
      );
    }

    return { message: 'Logged out successfully' };
  }

  async refreshToken(
    userId: string,
    rt: string,
    deviceInfo?: string,
    ipAddress?: string,
  ) {
    // Find the user
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new ForbiddenException('Invalid refresh token');
    }

    // Find matching refresh token in database by comparing hashes
    const storedTokens = await this.refreshTokenModel.find({
      userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    });

    let validToken: RefreshTokenDocument | null = null;
    for (const storedToken of storedTokens) {
      const matches = await bcrypt.compare(rt, storedToken.token);
      if (matches) {
        validToken = storedToken;
        break;
      }
    }

    if (!validToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Revoke old refresh token (token rotation)
    await this.refreshTokenModel.updateOne(
      { _id: validToken._id },
      { isRevoked: true },
    );

    // Generate new tokens
    const tokens = await this.generateTokens(user);

    // Store new refresh token
    await this.storeRefreshToken(
      tokens.refreshToken,
      user._id.toString(),
      deviceInfo || 'Unknown Device',
      ipAddress || 'Unknown IP',
    );

    return tokens;
  }

  async getMe(userId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }

  // Helper Methods

  async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, SALT_ROUNDS);
  }

  async generateTokens(user: UserDocument): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessExpiry = (this.configService.get<string>('JWT_ACCESS_EXPIRY') || '15m') as any;
    const refreshExpiry = (this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d') as any;

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiry,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiry,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    token: string,
    userId: string,
    userAgent: string,
    ipAddress: string,
  ) {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d';
    const expiresAt = this.calculateExpiry(expiresIn);

    // Hash the refresh token before storing
    const hashedToken = await this.hashData(token);

    await this.refreshTokenModel.create({
      token: hashedToken,
      userId,
      userAgent,
      ipAddress,
      expiresAt,
    });
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

  private async cleanupExpiredTokens(userId: string) {
    // Remove expired/revoked refresh tokens for this user
    await this.refreshTokenModel.deleteMany({
      userId,
      $or: [
        { isRevoked: true },
        { expiresAt: { $lt: new Date() } },
      ],
    });
  }
}
