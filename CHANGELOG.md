# Changelog

All notable changes to create-nestjs-auth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2025-12-04

### Added
- Multi-ORM support - Choose between Prisma, Drizzle, TypeORM, or Mongoose
- Multi-database support - PostgreSQL, MySQL, SQLite, or MongoDB
- Modular template architecture - Base + ORM + Database composition
- Comprehensive test scripts - Test each ORM individually
- Modular CLI source code - Split into organized modules in `src/`
- GitHub Actions CI/CD - Automated testing and npm publishing
- Open source essentials - CODE_OF_CONDUCT.md, SECURITY.md, PR templates
- New CLI flags: `--orm` and `--database` for non-interactive selection

### Changed
- CLI architecture modularized from single file to `src/` directory
- Package structure reorganized with `bin/` and `src/` directories
- Keywords updated for better npm discoverability
- Documentation consolidated (removed redundant markdown files)

### Removed
- `index.old.js` - Obsolete backup file
- `CHANGES.md` - Merged into CHANGELOG.md
- `INTERACTIVE_SETUP.md` - Merged into CONTRIBUTING.md
- `QUICK_REFERENCE.md` - Content moved to README.md
- Unnecessary devDependencies (TypeScript not needed for JS CLI)

## [1.1.0] - 2025-11-17

### Added
- Interactive mode - Run without arguments for guided setup
- Project name prompt with validation
- Package manager selection with auto-detection (npm, pnpm, yarn, bun)
- Setup preferences - Interactive prompts for git and dependency installation
- Automatic JWT secret generation - No manual `openssl` commands required
- Database URL prompt - Guided PostgreSQL connection string input
- Interactive database setup - Automatic Prisma generate, migrate, and seed
- Dev server auto-start option
- Post-setup workflow - Complete end-to-end interactive configuration
- `--yes` flag - Skip all prompts for CI/CD and automation

### Changed
- Made `app-name` argument optional (prompts if not provided)
- Updated CLI description to emphasize "Prisma + PostgreSQL"
- Improved success messages with interactive setup flow
- Enhanced documentation with interactive mode examples
- Updated README with two setup options (interactive vs manual)
- Reorganized post-creation instructions for clarity

### Dependencies
- Added `inquirer@^8.2.6` for interactive prompts

## [1.0.0] - 2025-11-16

### Added
- Initial release of create-nestjs-auth CLI
- Comprehensive error handling and validation
- App name validation (npm naming conventions)
- Node.js version checking (requires >= 20.x)
- Package manager auto-detection (npm, pnpm, yarn, bun)
- CLI options: `--skip-install`, `--package-manager`, `--skip-git`
- Automatic .env file creation from .env.example
- Git repository initialization with initial commit
- Proper package.json metadata for npm

### Security
- Secrets generation using cryptographically secure methods
- Validation to prevent directory traversal attacks
- Proper handling of environment variables

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 2.0.0 | 2025-12-04 | Multi-ORM and multi-database support |
| 1.1.0 | 2025-11-17 | Interactive mode and post-setup automation |
| 1.0.0 | 2025-11-16 | Initial release with Prisma + PostgreSQL |
