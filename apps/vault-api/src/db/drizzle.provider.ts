import { Provider } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export const DRIZZLE = Symbol('DRIZZLE');

export type DrizzleDB = NodePgDatabase<typeof schema>;

export const DrizzleProvider: Provider = {
  provide: DRIZZLE,
  useFactory: async (): Promise<DrizzleDB> => {
    const connectionString =
      process.env['DATABASE_URL'] ?? 'postgresql://vault:vault_dev_password@localhost:5432/vault';

    const pool = new Pool({ connectionString });

    // Validate the connection at startup
    const client = await pool.connect();
    client.release();

    return drizzle(pool, { schema });
  },
};
