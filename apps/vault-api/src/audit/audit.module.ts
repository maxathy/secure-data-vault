import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditController } from './audit.controller';
import { DrizzleAuditStorage } from './drizzle-audit-storage.adapter';

@Module({
  controllers: [AuditController],
  providers: [AuditService, DrizzleAuditStorage],
  exports: [AuditService],
})
export class AuditModule {}
