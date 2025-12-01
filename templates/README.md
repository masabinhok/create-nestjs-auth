# Templates Structure

This directory contains modular templates for generating NestJS authentication projects.

## Directory Structure

```
templates/
├── base/                    # Shared, ORM-agnostic code (80% of the project)
│   ├── src/
│   │   ├── common/          # Guards, decorators, filters, interceptors
│   │   ├── config/          # Configuration module, logger
│   │   ├── modules/
│   │   │   ├── auth/        # Auth controller & DTOs (no service - ORM-specific)
│   │   │   └── users/       # Users controller & DTOs (no service - ORM-specific)
│   │   └── main.ts          # Application entry point
│   ├── test/                # E2E tests
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── nest-cli.json
│   └── eslint.config.mjs
│
├── orm/                     # ORM-specific implementations
│   ├── prisma/              # Prisma adapter
│   │   ├── prisma/          # Schema & seed files
│   │   ├── src/
│   │   │   ├── prisma/      # PrismaService & PrismaModule
│   │   │   ├── modules/
│   │   │   │   ├── auth/    # Auth service & module
│   │   │   │   ├── users/   # Users service & module
│   │   │   │   └── health/  # Health controller (DB-aware)
│   │   │   ├── config/      # env.validation.ts
│   │   │   └── app.module.ts
│   │   └── package.json     # ORM-specific dependencies
│   │
│   ├── typeorm/             # (Future) TypeORM adapter
│   ├── mongoose/            # (Future) Mongoose adapter
│   └── drizzle/             # (Future) Drizzle adapter
│
└── database/                # Database-specific configurations
    ├── postgres/
    │   ├── .env.example
    │   └── prisma/schema.prisma  # (if different from default)
    ├── mysql/
    │   ├── .env.example
    │   └── prisma/schema.prisma
    ├── sqlite/
    │   ├── .env.example
    │   └── prisma/schema.prisma
    └── mongodb/
        ├── .env.example
        └── prisma/schema.prisma
```

## How Generation Works

1. **Copy base template** → All shared code (guards, decorators, main.ts, etc.)
2. **Copy ORM adapter** → Overwrites/adds ORM-specific files (services, modules)
3. **Copy database config** → Overwrites database-specific files (schema, .env)

## Adding a New ORM

1. Create `templates/orm/<orm-name>/` directory
2. Add ORM-specific files:
   - `src/<orm>/` - ORM service & module
   - `src/modules/auth/auth.service.ts` - Auth service using the ORM
   - `src/modules/auth/auth.module.ts` - Auth module with ORM imports
   - `src/modules/users/users.service.ts` - Users service
   - `src/modules/users/users.module.ts` - Users module
   - `src/modules/health/` - Health check with DB indicator
   - `src/app.module.ts` - Root module with ORM imports
   - `package.json` - ORM-specific dependencies
3. Update `index.js` to add the ORM to `ORM_OPTIONS`

## Adding a New Database

1. Create `templates/database/<db-name>/` directory
2. Add database-specific files:
   - `.env.example` - With correct DATABASE_URL format
   - `prisma/schema.prisma` - (If using Prisma) DB-specific schema
3. Update `index.js` to add the database to `DATABASE_OPTIONS`
