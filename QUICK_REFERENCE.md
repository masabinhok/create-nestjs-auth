# create-nestjs-auth - Quick Reference

## Installation

```bash
# Interactive mode (recommended) - will prompt for options
npx create-nestjs-auth@latest

# Or provide app name directly
npx create-nestjs-auth@latest my-app

# Or install globally
npm install -g create-nestjs-auth
create-nestjs-auth
```

## Commands

```bash
# Interactive mode - prompts for project details
npx create-nestjs-auth@latest

# Basic usage with app name
npx create-nestjs-auth@latest <app-name>

# Non-interactive mode (use defaults)
npx create-nestjs-auth@latest my-app --yes

# With options
npx create-nestjs-auth@latest my-app --skip-install
npx create-nestjs-auth@latest my-app --package-manager pnpm
npx create-nestjs-auth@latest my-app --skip-git

# Get help
npx create-nestjs-auth@latest --help

# Check version
npx create-nestjs-auth@latest --version
```

## Options

| Option | Description |
|--------|-------------|
| `--yes` | Skip all prompts and use defaults (non-interactive) |
| `--skip-install` | Skip npm/pnpm/yarn/bun install |
| `--package-manager <pm>` | Force specific package manager (npm/pnpm/yarn/bun) |
| `--skip-git` | Don't initialize git repository |

## After Creation

### Interactive Setup (Automatic)
The CLI will offer to complete setup automatically:
- ✨ Generates JWT secrets
- 🔧 Configures .env file
- 📦 Sets up Prisma database
- 🌱 Seeds default admin user
- 🚀 Optionally starts dev server

Just answer "Yes" to the prompts!

### Manual Setup (if needed)
```bash
cd my-app

# 1. Generate JWT secrets
openssl rand -base64 32  # Use for JWT_ACCESS_SECRET
openssl rand -base64 32  # Use for JWT_REFRESH_SECRET

# 2. Edit .env with your values
# 3. Setup database
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed

# 4. Start dev server
npm run start:dev
```

## Default Credentials

```
Email:    admin@example.com
Password: Admin@123
```

## Common Commands in Generated Project

```bash
# Development
npm run start:dev           # Start with hot reload
npm run start:debug         # Start with debugging

# Database
npm run prisma:studio       # Open Prisma Studio (database GUI)
npm run prisma:migrate      # Run migrations
npm run prisma:seed         # Seed database
npm run prisma:generate     # Generate Prisma Client

# Testing
npm run test               # Run unit tests
npm run test:e2e          # Run E2E tests
npm run test:cov          # Generate coverage report

# Production
npm run build             # Build for production
npm run start:prod        # Start production server

# Code Quality
npm run lint              # Lint code
npm run format            # Format with Prettier
```

## API Endpoints

Base URL: `http://localhost:8080/api/v1`

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Users (Admin only)
- `GET /users` - List all users (paginated)
- `GET /users/:id` - Get user by ID
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Profile
- `GET /users/profile` - Get own profile
- `PATCH /users/profile` - Update own profile

### Health
- `GET /health` - Full health check
- `GET /health/ready` - Readiness probe
- `GET /health/live` - Liveness probe

## Example Requests

```bash
# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"admin@example.com","password":"Admin@123"}'

# Get profile (requires cookies from login)
curl http://localhost:8080/api/v1/auth/me -b cookies.txt

# List users (admin only)
curl http://localhost:8080/api/v1/users -b cookies.txt
```

## Troubleshooting

### CLI Issues

**Problem**: Command not found  
**Solution**: Use `npx create-nestjs-auth@latest my-app`

**Problem**: Template not found  
**Solution**: Reinstall - `npm install -g create-nestjs-auth`

**Problem**: Node version error  
**Solution**: Upgrade to Node.js 20+ - `nvm install 20; nvm use 20`

### Project Issues

**Problem**: Database connection error  
**Solution**: Check DATABASE_URL in .env, ensure PostgreSQL is running

**Problem**: JWT errors  
**Solution**: Regenerate secrets with `openssl rand -base64 32`

**Problem**: Port 8080 in use  
**Solution**: Change PORT in .env or kill process on 8080

## Requirements

- Node.js >= 20.x
- PostgreSQL >= 16.x
- npm >= 10.x (or equivalent)

## Links

- 📖 [Full Documentation](https://github.com/masabinhok/nestjs-jwt-rbac-boilerplate)
- 🐛 [Report Issues](https://github.com/masabinhok/create-nestjs-auth/issues)
- 💬 [Discussions](https://github.com/masabinhok/create-nestjs-auth/discussions)
- 📦 [npm Package](https://www.npmjs.com/package/create-nestjs-auth)

## Support

- Open an issue for bugs
- Tag with appropriate labels
- Provide full error output
- Include Node.js and npm versions

---

Made with ❤️ by [masabinhok](https://github.com/masabinhok)
