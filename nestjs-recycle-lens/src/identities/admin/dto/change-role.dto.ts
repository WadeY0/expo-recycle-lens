import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class ChangeRoleDto {
  @ApiProperty({
    example: 'admin',
    description: 'New role for the user',
    enum: ['user', 'admin'],
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['user', 'admin'])
  role: string;
}
