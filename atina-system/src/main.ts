import './load-env';
import { NestFactory } from '@nestjs/core';
import type { Application } from 'express';
import { AppModule } from './app.module';
import { configureHttpApp } from './bootstrap/configure-app';
import { validateProductionEnv } from './config/validate-production-env';

async function bootstrap() {
  validateProductionEnv();

  const app = await NestFactory.create(AppModule);
  const trust = process.env.TRUST_PROXY?.trim();
  if (trust === '1' || /^true$/i.test(trust ?? '')) {
    const expressApp = app.getHttpAdapter().getInstance() as Application;
    expressApp.set('trust proxy', 1);
  }
  configureHttpApp(app);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Atina System listening on http://0.0.0.0:${port}`);
}
bootstrap();
