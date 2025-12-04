/**
 * CLI Constants and Configuration
 * @module constants
 */

const ORM_OPTIONS = {
  prisma: {
    name: 'Prisma',
    description: 'Next-generation ORM with type safety',
    databases: ['postgres', 'mysql', 'sqlite'],
  },
  typeorm: {
    name: 'TypeORM',
    description: 'Traditional ORM with decorators',
    databases: ['postgres', 'mysql', 'sqlite'],
  },
  drizzle: {
    name: 'Drizzle',
    description: 'Lightweight TypeScript ORM',
    databases: ['postgres', 'mysql', 'sqlite'],
  },
  mongoose: {
    name: 'Mongoose',
    description: 'MongoDB ODM (MongoDB only)',
    databases: ['mongodb'],
    fixedDatabase: true,
  },
};

const DATABASE_OPTIONS = {
  postgres: {
    name: 'PostgreSQL',
    urlTemplate: 'postgresql://user:password@localhost:5432/database_name',
    urlPrefix: ['postgresql://', 'postgres://'],
  },
  mysql: {
    name: 'MySQL',
    urlTemplate: 'mysql://user:password@localhost:3306/database_name',
    urlPrefix: ['mysql://'],
  },
  sqlite: {
    name: 'SQLite',
    urlTemplate: 'file:./dev.db',
    urlPrefix: ['file:'],
    devOnly: true,
  },
  mongodb: {
    name: 'MongoDB',
    urlTemplate: 'mongodb://user:password@localhost:27017/database_name',
    urlPrefix: ['mongodb://', 'mongodb+srv://'],
  },
};

const RESERVED_NAMES = ['node_modules', 'favicon.ico'];

const CLI_VERSION = '2.0.0';

module.exports = {
  ORM_OPTIONS,
  DATABASE_OPTIONS,
  RESERVED_NAMES,
  CLI_VERSION,
};
