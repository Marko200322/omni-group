/** Shared by TypeORM CLI (`data-source.ts`) and Nest `TypeOrmModule.forRoot`. */
export function postgresSslOption(): false | { rejectUnauthorized: boolean } {
  const on = process.env.POSTGRES_SSL?.toLowerCase();
  if (on === 'true' || on === '1') {
    return {
      rejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED?.toLowerCase() !== 'false',
    };
  }
  return false;
}
