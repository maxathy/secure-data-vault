import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { AuditService } from './audit.service';
import { ZodQuery } from '../common/decorators/zod-schema.decorator';
import {
  AuditQuerySchema,
  type AuditQueryDto,
  type VerifyChainResponse,
} from '@secure-data-vault/shared-types';

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Verify the integrity of the audit chain.
   * Walks all entries (or a subset via from/to) and checks hash
   * linkage, entry hashes, and HMAC signatures.
   */
  @Get('verify')
  @SkipThrottle()
  @ZodQuery(AuditQuerySchema)
  async verify(@Query() query: AuditQueryDto): Promise<VerifyChainResponse> {
    const result = await this.auditService.verify(query.from, query.to);
    return {
      status: result.status,
      checkedRows: result.checkedRows,
      firstDivergentSequence: result.firstDivergentSequence,
    };
  }

  /**
   * List audit log entries, optionally filtered by sequence range.
   */
  @Get()
  @ZodQuery(AuditQuerySchema)
  async list(@Query() query: AuditQueryDto) {
    const entries = await this.auditService.getEntries(query.from, query.to);
    return entries.map((e) => ({
      ...e,
      sequence: e.sequence.toString(),
      timestamp: new Date(e.timestamp).toISOString(),
    }));
  }
}
