import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { DrizzleAuditStorage } from './drizzle-audit-storage.adapter';

@Module({
  providers: [AuditService, DrizzleAuditStorage],
  exports: [AuditService],
})
export class AuditModule {}
