# Contributing to create-nestjs-auth

Thank you for your interest in contributing! This document provides guidelines for contributing to the create-nestjs-auth CLI tool.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Coding Guidelines](#coding-guidelines)

## Code of Conduct

Please read our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing. We are committed to providing a welcoming and inclusive environment.

## Getting Started

### Prerequisites

- Node.js >= 20.x
- npm, pnpm, yarn, or bun
- Git

### Setup

```bash
# Fork and clone the repository
git clone https://github.com/YOUR_USERNAME/create-nestjs-auth.git
cd create-nestjs-auth

# Install dependencies
npm install

# Link for local testing
npm link

# Now you can test with
create-nestjs-auth my-test-app --skip-install
```

## Project Structure

```
create-nestjs-auth/
├── index.js              # Entry point (re-exports bin/cli.js)
├── bin/
│   └── cli.js            # Main CLI implementation
├── src/
│   ├── index.js          # Module exports
│   ├── constants.js      # Configuration constants
│   ├── utils.js          # Utility functions
│   ├── prompts.js        # Interactive prompts
│   ├── generator.js      # Project generation logic
│   └── postSetup.js      # Post-setup handlers
├── templates/
│   ├── base/             # Shared, ORM-agnostic code
│   ├── orm/              # ORM-specific implementations
│   │   ├── prisma/
│   │   ├── drizzle/
│   │   ├── typeorm/
│   │   └── mongoose/
│   └── database/         # Database-specific configurations
│       ├── postgres/
│       ├── mysql/
│       ├── sqlite/
│       └── mongodb/
├── .github/
│   ├── workflows/        # CI/CD workflows
│   ├── ISSUE_TEMPLATE/   # Issue templates
│   └── PULL_REQUEST_TEMPLATE.md
├── package.json
├── README.md
├── CONTRIBUTING.md       # This file
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── CHANGELOG.md
└── LICENSE
```

## Making Changes

### Branch Naming

- `feature/your-feature-name` - New features
- `fix/issue-description` - Bug fixes
- `docs/what-changed` - Documentation updates
- `refactor/what-changed` - Code refactoring

### Code Style

- Use consistent formatting (2 spaces for indentation)
- Add JSDoc comments for functions
- Use meaningful variable names
- Follow existing code patterns

### Adding a New ORM

1. Create a new directory under `templates/orm/your-orm/`
2. Include:
   - `package.json` with ORM-specific dependencies
   - `src/app.module.ts`
   - `src/modules/auth/` - Auth service & module
   - `src/modules/users/` - Users service & module
   - Database connection setup

3. Update `src/constants.js` with the new ORM option
4. Update `src/postSetup.js` with setup handlers
5. Add tests and documentation

### Adding a New Database

1. Create a new directory under `templates/database/your-db/`
2. Include:
   - `.env.example` with database URL template
   - Database-specific configurations
   - `package.json` with driver dependencies

3. Update `src/constants.js` with the new database option

## Testing

### Test Commands

```bash
# Quick test (skip install)
npm test

# Test specific ORM
npm run test:prisma
npm run test:drizzle
npm run test:typeorm
npm run test:mongoose

# Full test with installation
npm run test:full

# Clean up test outputs
npm run clean
```

### Manual Testing Checklist

- [ ] Test with all ORM options
- [ ] Test with all database options
- [ ] Test with different package managers
- [ ] Test with `--yes` flag
- [ ] Test with `--skip-install` flag
- [ ] Test with `--skip-git` flag
- [ ] Verify generated project structure
- [ ] Verify package.json is correctly merged

## Pull Request Process

1. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write clear, concise commit messages
   - One feature/fix per pull request
   - Include tests if applicable

3. **Test Your Changes**
   ```bash
   npm test
   npm run clean
   ```

4. **Update Documentation**
   - Update README.md if adding features
   - Update CHANGELOG.md

5. **Submit PR**
   - Use the PR template
   - Link related issues
   - Provide screenshots if applicable

### Commit Message Format

```
type(scope): brief description

Longer description if needed

Fixes #123
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `chore` - Maintenance
- `refactor` - Code refactoring
- `test` - Tests

**Examples:**
- `feat(cli): add --orm option for ORM selection`
- `fix(generator): handle missing .env.example`
- `docs(readme): update installation instructions`

## Coding Guidelines

### JavaScript

```javascript
// Use JSDoc for functions
/**
 * Description of function
 * @param {string} param1 - Description
 * @returns {Promise<object>} Description
 */
async function myFunction(param1) {
  // Implementation
}

// Prefer early returns
function validate(input) {
  if (!input) {
    return false;
  }
  // Continue with validation
  return true;
}

// Use descriptive variable names
const projectDirectory = path.join(process.cwd(), appName);
// Not: const dir = path.join(process.cwd(), n);
```

### Error Handling

```javascript
try {
  await fs.copy(source, destination);
} catch (error) {
  console.error(chalk.red('❌ Failed to copy files'));
  console.error(chalk.yellow(`   ${error.message}`));
  process.exit(1);
}
```

## Need Help?

- Open an issue with the `question` label
- Check existing issues first
- Join discussions on GitHub

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
