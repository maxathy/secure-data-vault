import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { ZodBody } from '../common/decorators/zod-schema.decorator';
import {
  CreateUserSchema,
  type CreateUserDto,
  type UserResponse,
} from '@secure-data-vault/shared-types';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ZodBody(CreateUserSchema)
  @AuditAction('users:create', 'user')
  async create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    return this.usersService.create(dto);
  }

  @Get()
  async findAll(): Promise<UserResponse[]> {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.findOne(id);
  }
}
