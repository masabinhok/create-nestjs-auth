import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';
import { RefreshTokenGuard } from 'src/common/guards/refresh-token.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';
import { SignupDto } from './dtos/signup.dto';
import { LoginDto } from './dtos/login.dto';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { COOKIE_CONFIG } from 'src/common/constants/cookie.config';
import { CookieOptions } from 'express';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered.',
    schema: {
      example: {
        statusCode: 201,
        message: 'User registered successfully',
        data: {
          id: 'clxyz...',
          email: 'user@example.com',
          fullName: 'John Doe',
          role: 'USER',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error - invalid input data.',
  })
  @ApiResponse({ status: 409, description: 'Conflict - email already exists.' })
  @Throttle({ strict: { ttl: 60000, limit: 3 } })
  @Public()
  @Post('/signup')
  async signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({
    status: 200,
    description: 'User successfully logged in. Tokens set in cookies.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Login successful',
        data: {
          user: {
            id: 'clxyz...',
            email: 'user@example.com',
            fullName: 'John Doe',
            role: 'USER',
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid credentials.',
  })
  @Throttle({ strict: { ttl: 60000, limit: 5 } })
  @Public()
  @Post('/login')
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      'Unknown IP';

    const data = await this.authService.login(loginDto, deviceInfo, ipAddress);

    res.cookie(
      COOKIE_CONFIG.ACCESS_TOKEN.name,
      data.accessToken,
      COOKIE_CONFIG.ACCESS_TOKEN.options as CookieOptions,
    );
    res.cookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      data.refreshToken,
      COOKIE_CONFIG.REFRESH_TOKEN.options as CookieOptions,
    );

    return {
      user: data.user,
    };
  }

  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Tokens refreshed successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired refresh token.',
  })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('/refresh')
  async refreshToken(
    @GetUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rt = req.cookies[COOKIE_CONFIG.REFRESH_TOKEN.name] as string;
    const deviceInfo = req.headers['user-agent'] || 'Unknown Device';
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.ip ||
      'Unknown IP';

    const { accessToken, refreshToken } = await this.authService.refreshToken(
      userId,
      rt,
      deviceInfo,
      ipAddress,
    );

    res.cookie(
      COOKIE_CONFIG.ACCESS_TOKEN.name,
      accessToken,
      COOKIE_CONFIG.ACCESS_TOKEN.options as CookieOptions,
    );
    res.cookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      refreshToken,
      COOKIE_CONFIG.REFRESH_TOKEN.options as CookieOptions,
    );

    return {
      message: 'Tokens refreshed successfully',
    };
  }

  @ApiOperation({ summary: 'Logout and invalidate tokens' })
  @ApiResponse({
    status: 200,
    description: 'User logged out successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Logged out successfully',
      },
    },
  })
  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('/logout')
  async logout(
    @GetUser('sub') userId: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rt = req.cookies[COOKIE_CONFIG.REFRESH_TOKEN.name] as
      | string
      | undefined;
    await this.authService.logout(userId, rt);

    res.clearCookie(
      COOKIE_CONFIG.ACCESS_TOKEN.name,
      COOKIE_CONFIG.ACCESS_TOKEN.options as CookieOptions | undefined,
    );
    res.clearCookie(
      COOKIE_CONFIG.REFRESH_TOKEN.name,
      COOKIE_CONFIG.REFRESH_TOKEN.options as CookieOptions | undefined,
    );

    return {
      message: 'Logged out successfully',
    };
  }

  @ApiBearerAuth('bearer')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current user profile.',
    schema: {
      example: {
        statusCode: 200,
        data: {
          id: 'clxyz...',
          email: 'user@example.com',
          fullName: 'John Doe',
          role: 'USER',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token.',
  })
  @SkipThrottle()
  @Get('/me')
  async getMe(@GetUser('sub') userId: string) {
    return this.authService.getMe(userId);
  }
}
