import { DataSource } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const dataSource = new DataSource({
  type: (process.env.DB_TYPE as any) || 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, RefreshToken],
  synchronize: false,
});

async function seed() {
  console.log('🌱 Seeding database...');

  await dataSource.initialize();

  const userRepository = dataSource.getRepository(User);

  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const userPassword = await bcrypt.hash('User@123', 12);

  // Create admin user
  let admin = await userRepository.findOne({
    where: { email: 'admin@example.com' },
  });

  if (!admin) {
    admin = userRepository.create({
      email: 'admin@example.com',
      passwordHash: adminPassword,
      fullName: 'Admin User',
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepository.save(admin);
  }

  // Create regular user
  let user = await userRepository.findOne({
    where: { email: 'user@example.com' },
  });

  if (!user) {
    user = userRepository.create({
      email: 'user@example.com',
      passwordHash: userPassword,
      fullName: 'Regular User',
      role: UserRole.USER,
      isActive: true,
    });
    await userRepository.save(user);
  }

  console.log('✅ Seeding completed');
  console.log('\n📋 Test Credentials:');
  console.log('===================');
  console.log('Admin User:');
  console.log('  Email:', admin.email);
  console.log('  Password: Admin@123');
  console.log('  Role:', admin.role);
  console.log('\nRegular User:');
  console.log('  Email:', user.email);
  console.log('  Password: User@123');
  console.log('  Role:', user.role);

  await dataSource.destroy();
}

seed().catch((e) => {
  console.error('❌ Seeding failed:', e);
  process.exit(1);
});
