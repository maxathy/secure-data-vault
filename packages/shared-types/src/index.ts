export {
  UuidSchema,
  PaginationSchema,
  PaginatedResponseSchema,
  Rfc7807ErrorSchema,
  type PaginationDto,
  type Rfc7807Error,
} from './common.schema.js';

export {
  CreateTenantSchema,
  TenantResponseSchema,
  type CreateTenantDto,
  type TenantResponse,
} from './tenant.schema.js';

export {
  CreateUserSchema,
  UserResponseSchema,
  type CreateUserDto,
  type UserResponse,
} from './user.schema.js';

export {
  CreateRecordSchema,
  UpdateRecordSchema,
  DeleteRecordSchema,
  EncryptedEnvelopeSchema,
  RecordResponseSchema,
  type CreateRecordDto,
  type UpdateRecordDto,
  type DeleteRecordDto,
  type EncryptedEnvelope,
  type RecordResponse,
} from './record.schema.js';

export {
  AuditEntrySchema,
  AuditQuerySchema,
  VerifyChainResponseSchema,
  type AuditEntryResponse,
  type AuditQueryDto,
  type VerifyChainResponse,
} from './audit.schema.js';
