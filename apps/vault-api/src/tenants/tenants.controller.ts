import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { ZodBody } from '../common/decorators/zod-schema.decorator';
import {
  CreateTenantSchema,
  type CreateTenantDto,
  type TenantResponse,
} from '@secure-data-vault/shared-types';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @ZodBody(CreateTenantSchema)
  @AuditAction('tenants:create', 'tenant')
  async create(@Body() dto: CreateTenantDto): Promise<TenantResponse> {
    return this.tenantsService.create(dto);
  }

  @Get()
  async findAll(): Promise<TenantResponse[]> {
    return this.tenantsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<TenantResponse> {
    return this.tenantsService.findOne(id);
  }
}
