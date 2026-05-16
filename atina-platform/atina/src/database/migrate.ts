import fs from 'fs';
import path from 'path';
import { query, testConnection, closePool } from './connection';
import logger from '../utils/logger';

async function runMigrations(): Promise<void> {
  const connected = await testConnection();
  if (!connected) {
    logger.error('Cannot connect to database. Aborting migrations.');
    process.exit(1);
  }

  // Ensure migration tracking table exists
  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(50) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  logger.info(`Found ${files.length} migration files`);

  for (const file of files) {
    const version = file.replace('.sql', '');
    const { rows } = await query(
      'SELECT version FROM schema_migrations WHERE version = $1',
      [version]
    );

    if (rows.length > 0) {
      logger.info(`Migration ${version} already applied — skipping`);
      continue;
    }

    logger.info(`Applying migration: ${version}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');

    try {
      await query(sql);
      await query(
        'INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING',
        [version]
      );
      logger.info(`Migration ${version} applied successfully`);
    } catch (error) {
      logger.error(`Migration ${version} failed`, { error });
      throw error;
    }
  }

  logger.info('All migrations completed');
  await closePool();
}

runMigrations().catch((err) => {
  logger.error('Migration runner failed', { error: err });
  process.exit(1);
});
