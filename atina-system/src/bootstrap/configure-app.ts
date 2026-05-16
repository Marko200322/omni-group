import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import helmet from 'helmet';

export function corsOptionsFromEnv(): CorsOptions {
  const raw = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (raw?.length) {
    return { origin: raw.length === 1 ? raw[0] : raw, credentials: true };
  }
  return { origin: true, credentials: true };
}

/** Ista konfiguracija kao u produkcijskom HTTP stack-u (bez listen). */
export function configureHttpApp(app: INestApplication): void {
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors(corsOptionsFromEnv());
}
