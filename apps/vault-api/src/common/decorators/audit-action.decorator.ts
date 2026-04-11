import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit:action';
export const AUDIT_RESOURCE_TYPE_KEY = 'audit:resourceType';

/**
 * Marks a controller method with audit metadata.
 * The AuditInterceptor reads this to populate the audit log entry.
 *
 * Usage:
 *   @Post()
 *   @AuditAction('records:create', 'record')
 *   create(...) { ... }
 */
export function AuditAction(action: string, resourceType: string) {
  return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(AUDIT_ACTION_KEY, action)(target, propertyKey, descriptor);
    SetMetadata(AUDIT_RESOURCE_TYPE_KEY, resourceType)(target, propertyKey, descriptor);
  };
}
