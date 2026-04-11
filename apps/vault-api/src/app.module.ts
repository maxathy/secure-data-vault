import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { DrizzleModule } from './db/drizzle.module';
import { CryptoModule } from './crypto/crypto.module';
import { AuditModule } from './audit/audit.module';
import { HealthModule } from './health/health.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { CorrelationMiddleware } from './common/correlation/correlation.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ZodValidationInterceptor } from './common/pipes/zod-validation.pipe';
import { ZodResponseInterceptor } from './common/interceptors/zod-response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    DrizzleModule,
    CryptoModule,
    AuditModule,
    HealthModule,
    TenantsModule,
    UsersModule,
  ],
  providers: [
    // Global guard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global filter
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Global interceptors (order matters: outer → inner)
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ZodValidationInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ZodResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
