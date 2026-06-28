import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';
import { UserRole } from '../../../schemas/user.schema';

export class UpdateUserDto extends UpdateProfileDto {
  @ApiPropertyOptional({
    description: 'User role',
    enum: UserRole,
    example: 'ADMIN',
  })
  @IsOptional()
  @IsEnum(UserRole, { message: 'Role must be a valid UserRole' })
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Whether the user account is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
