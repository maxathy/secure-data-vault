import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.setGlobalPrefix('api/v1');
  app.enableCors();

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);

  console.log(`vault-api listening on port ${port}`);
}

bootstrap();
