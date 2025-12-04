import { IsEnum, IsOptional } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';
import { Role } from '../../../schemas/user.schema';

export class UpdateUserDto extends UpdateProfileDto {
  @IsOptional()
  @IsEnum(Role, { message: 'Role must be a valid Role' })
  role?: Role;
}
