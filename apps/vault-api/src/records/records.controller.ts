import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RecordsService } from './records.service';
import { AuditAction } from '../common/decorators/audit-action.decorator';
import { ZodBody } from '../common/decorators/zod-schema.decorator';
import {
  CreateRecordSchema,
  UpdateRecordSchema,
  DeleteRecordSchema,
  type CreateRecordDto,
  type UpdateRecordDto,
  type DeleteRecordDto,
  type RecordResponse,
} from '@secure-data-vault/shared-types';

@Controller('records')
@Throttle({ default: { ttl: 60000, limit: 20 } }) // Tighter rate limit for records
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  @ZodBody(CreateRecordSchema)
  @AuditAction('records:create', 'record')
  async create(@Body() dto: CreateRecordDto): Promise<RecordResponse> {
    return this.recordsService.create(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<RecordResponse> {
    return this.recordsService.findOne(id);
  }

  @Put(':id')
  @ZodBody(UpdateRecordSchema)
  @AuditAction('records:update', 'record')
  async update(@Param('id') id: string, @Body() dto: UpdateRecordDto): Promise<RecordResponse> {
    return this.recordsService.update(id, dto, dto.tenantId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ZodBody(DeleteRecordSchema)
  @AuditAction('records:delete', 'record')
  async delete(@Param('id') id: string, @Body() body: DeleteRecordDto): Promise<void> {
    return this.recordsService.delete(id, body.tenantId);
  }
}
