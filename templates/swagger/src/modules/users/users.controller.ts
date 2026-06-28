import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/guards/roles.guard';
import { UpdateUserDto } from './dtos/update-user.dto';
import { UpdateProfileDto } from './dtos/update-profile.dto';
import { PaginationDto } from 'src/common/dtos/pagination.dto';

@ApiBearerAuth('bearer')
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // profile routes
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns the authenticated user profile.',
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
  @Get('/profile')
  async getProfile(@GetUser('sub') userId: string) {
    return this.usersService.getProfile(userId);
  }

  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'Profile updated successfully',
        data: {
          id: 'clxyz...',
          email: 'user@example.com',
          fullName: 'Jane Doe',
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
  @Patch('/profile')
  async updateProfile(
    @GetUser('sub') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, updateProfileDto);
  }

  // admin routes
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of all users.',
    schema: {
      example: {
        statusCode: 200,
        data: {
          data: [
            {
              id: 'clxyz...',
              email: 'user@example.com',
              fullName: 'John Doe',
              role: 'USER',
              isActive: true,
            },
          ],
          meta: {
            total: 50,
            page: 1,
            limit: 10,
            totalPages: 5,
            hasNext: true,
            hasPrevious: false,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required.' })
  @Roles(UserRole.ADMIN)
  @Get('/')
  async getAllUsers(@Query() paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    return this.usersService.getAllUsers(page, limit);
  }

  @ApiOperation({ summary: 'Get a user by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the user with the specified ID.',
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
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Roles(UserRole.ADMIN)
  @Get('/:id')
  async getUserById(@Param('id') id: string) {
    return this.usersService.getUserById(id);
  }

  @ApiOperation({ summary: 'Update a user by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'User updated successfully',
        data: {
          id: 'clxyz...',
          email: 'user@example.com',
          fullName: 'John Doe',
          role: 'ADMIN',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Roles(UserRole.ADMIN)
  @Patch('/:id')
  async updateUserById(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.updateUserById(id, updateUserDto);
  }

  //this soft deletes a user by setting isActive to false
  @ApiOperation({ summary: 'Soft delete a user by ID (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'User deactivated successfully.',
    schema: {
      example: {
        statusCode: 200,
        message: 'User deactivated successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or missing JWT token.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @Roles(UserRole.ADMIN)
  @Delete('/:id')
  async deleteUserById(@Param('id') id: string) {
    return this.usersService.deleteUserById(id);
  }
}
