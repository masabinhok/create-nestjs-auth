import { connect, connection } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SALT_ROUNDS = 12;

interface UserDoc {
  fullName: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'ADMIN';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ DATABASE_URL is not defined in environment variables');
    process.exit(1);
  }

  console.log('🌱 Starting database seed...\n');

  try {
    // Connect to MongoDB
    await connect(databaseUrl);
    console.log('✓ Connected to MongoDB');

    const db = connection.db;
    if (!db) {
      throw new Error('Failed to get database instance from connection');
    }
    const usersCollection = db.collection('users');

    // Check if admin already exists
    const existingAdmin = await usersCollection.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists, skipping...');
    } else {
      // Create admin user
      const adminPasswordHash = await bcrypt.hash('Admin@123', SALT_ROUNDS);
      const now = new Date();
      
      const adminUser: UserDoc = {
        fullName: 'Admin User',
        email: 'admin@example.com',
        passwordHash: adminPasswordHash,
        role: 'ADMIN',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await usersCollection.insertOne(adminUser);
      console.log('✓ Created admin user');
      console.log('  Email:    admin@example.com');
      console.log('  Password: Admin@123');
    }

    // Check if regular user already exists
    const existingUser = await usersCollection.findOne({ email: 'user@example.com' });
    
    if (existingUser) {
      console.log('⚠️  Regular user already exists, skipping...');
    } else {
      // Create regular user
      const userPasswordHash = await bcrypt.hash('User@123', SALT_ROUNDS);
      const now = new Date();
      
      const regularUser: UserDoc = {
        fullName: 'Regular User',
        email: 'user@example.com',
        passwordHash: userPasswordHash,
        role: 'USER',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };

      await usersCollection.insertOne(regularUser);
      console.log('✓ Created regular user');
      console.log('  Email:    user@example.com');
      console.log('  Password: User@123');
    }

    // Create indexes
    console.log('\n📇 Creating indexes...');
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    console.log('✓ Created unique index on users.email');

    console.log('\n✅ Database seed completed successfully!\n');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await connection.close();
  }
}

seed();
