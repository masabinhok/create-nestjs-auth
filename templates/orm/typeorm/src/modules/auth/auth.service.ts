import {
  Injectable,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, In } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { User } from 'src/entities/user.entity';
import { RefreshToken } from 'src/entities/refresh-token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private config: ConfigService,
    private logger: Logger,
  ) {}

  async signup(signupDto: SignupDto) {
    const { email, password, fullName } = signupDto;

    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const hashedPassword = await this.hashData(password);

    const newUser = this.userRepository.create({
      email,
      passwordHash: hashedPassword,
      fullName,
    });

    await this.userRepository.save(newUser);

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

    const user = await this.userRepository.findOne({
      where: { email },
    });

    const passwordHash =
      user?.passwordHash ||
      (await this.hashData('dummy-password-to-prevent-timing-attack'));
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!user || !user.isActive || !passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokens(user);
    const hashedRt = await this.hashData(tokens.refreshToken);

    const refreshExpiry =
      this.config.get<string>('JWT_REFRESH_EXPIRY') || '30d';
    const expiryMs = this.parseExpiryToMilliseconds(refreshExpiry);
    const expiresAt = new Date(Date.now() + expiryMs);

    const refreshToken = this.refreshTokenRepository.create({
      token: hashedRt,
      userId: user.id,
      deviceInfo: deviceInfo || 'Unknown Device',
      ipAddress: ipAddress || 'Unknown IP',
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);
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
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException('Invalid refresh token');
    }

    const storedTokens = await this.refreshTokenRepository.find({
      where: {
        userId: user.id,
        expiresAt: MoreThanOrEqual(new Date()),
      },
    });

    let isValidToken = false;
    let validTokenId: string | null = null;

    for (const storedToken of storedTokens) {
      const matches = await bcrypt.compare(rt, storedToken.token);
      if (matches) {
        isValidToken = true;
        validTokenId = storedToken.id;
        break;
      }
    }

    if (!isValidToken || !validTokenId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokens = await this.generateTokens(user);
    const hashedRt = await this.hashData(tokens.refreshToken);

    const refreshExpiry =
      this.config.get<string>('JWT_REFRESH_EXPIRY') || '30d';
    const expiryMs = this.parseExpiryToMilliseconds(refreshExpiry);
    const expiresAt = new Date(Date.now() + expiryMs);

    await this.refreshTokenRepository.update(validTokenId, {
      token: hashedRt,
      deviceInfo: deviceInfo || 'Unknown Device',
      ipAddress: ipAddress || 'Unknown IP',
      expiresAt,
    });

    return tokens;
  }

  async logout(userId: string, rt?: string) {
    if (rt) {
      const storedTokens = await this.refreshTokenRepository.find({
        where: { userId },
      });

      for (const storedToken of storedTokens) {
        const matches = await bcrypt.compare(rt, storedToken.token);
        if (matches) {
          await this.refreshTokenRepository.delete(storedToken.id);
          break;
        }
      }
    } else {
      await this.refreshTokenRepository.delete({ userId });
    }

    return {
      message: 'Logged out successfully',
    };
  }

  async getMe(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

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
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(data, salt);
  }

  async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, role: user.role, email: user.email };
    const accessExpiry = this.config.get<string>('JWT_ACCESS_EXPIRY') || '15m';
    const refreshExpiry = this.config.get<string>('JWT_REFRESH_EXPIRY') || '7d';

    const [accessToken, refreshToken] = await Promise.all([
      // @ts-expect-error - JWT library type definition issue with expiresIn accepting string
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: accessExpiry,
      }),
      // @ts-expect-error - JWT library type definition issue with expiresIn accepting string
      this.jwtService.signAsync(payload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiry,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async cleanupExpiredTokens(userId: string) {
    await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('userId = :userId AND expiresAt < :now', {
        userId,
        now: new Date(),
      })
      .execute();

    const tokens = await this.refreshTokenRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: 5,
      take: 100,
    });

    if (tokens.length > 0) {
      await this.refreshTokenRepository.delete({
        id: In(tokens.map((t) => t.id)),
      });
    }
  }

  private parseExpiryToMilliseconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 30 * 24 * 60 * 60 * 1000;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const units: { [key: string]: number } = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * units[unit];
  }
}
