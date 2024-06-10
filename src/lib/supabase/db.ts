import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import * as schema from '../../../migrations/schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

dotenv.config({ path: '.env' });

if (!process.env.DATABASE_URL) {
  console.log('🔴 No DATABASE_URL provided');
  process.exit(1); // Exit the script if DATABASE_URL is not provided
}

const client = postgres(process.env.DATABASE_URL as string, { max: 1 });
const db = drizzle(client, { schema });

const migrateDb = async () => {
  try {
    console.log('🟠 Starting migration');
    await migrate(db, { migrationsFolder: 'migrations' });
    console.log('🟢 Migration successful');
  } catch (error) {
    console.error('🔴 Error during migration:', error);
    process.exit(1); // Exit the script if migration fails
  }
};

migrateDb();
export default db;
