import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';
import { users } from './schema';

dotenv.config();

const SALT_ROUNDS = 12;

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not defined in environment variables');
    process.exit(1);
  }

  console.log('🌱 Starting database seed...\n');

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  try {
    // Check if admin already exists
    const [existingAdmin] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@example.com'))
      .limit(1);

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists, skipping...');
    } else {
      // Create admin user
      const adminPasswordHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);
      
      await db.insert(users).values({
        fullName: 'Admin User',
        email: 'admin@example.com',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        isActive: true,
      });

      console.log('✓ Created admin user');
      console.log('  Email:    admin@example.com');
      console.log('  Password: Admin@123');
    }

    // Check if regular user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, 'user@example.com'))
      .limit(1);

    if (existingUser) {
      console.log('⚠️  Regular user already exists, skipping...');
    } else {
      // Create regular user
      const userPasswordHash = await bcrypt.hash('User@123', SALT_ROUNDS);
      
      await db.insert(users).values({
        fullName: 'Regular User',
        email: 'user@example.com',
        passwordHash: userPasswordHash,
        role: 'USER',
        isActive: true,
      });

      console.log('✓ Created regular user');
      console.log('  Email:    user@example.com');
      console.log('  Password: User@123');
    }

    console.log('\n✅ Database seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
