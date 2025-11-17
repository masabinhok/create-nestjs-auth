# Changelog

All notable changes to create-nestjs-auth will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-16

### Added
- Initial release of create-nestjs-auth CLI
- Comprehensive error handling and validation
- App name validation (npm naming conventions)
- Node.js version checking (requires >= 20.x)
- Package manager auto-detection (npm, pnpm, yarn, bun)
- Multiple CLI options:
  - `--skip-install` - Skip dependency installation
  - `--package-manager` - Choose specific package manager
  - `--skip-git` - Skip git initialization
- Automatic .env file creation from .env.example
- Git repository initialization with initial commit
- Interactive setup script (`npm run setup`) in generated projects
- Comprehensive README with usage examples
- .npmignore for clean npm package
- Proper package.json metadata for npm

### Changed
- Improved user feedback with better console messages
- Enhanced error messages with actionable solutions
- Better handling of missing template files
- Excluded .git directory from template copying

### Fixed
- Silent failures during file operations
- Missing validation for app names
- Hardcoded npm commands (now respects package manager)
- Template's .git directory being copied to new projects
- No timeout on dependency installation
- Missing documentation for CLI usage

### Security
- Secrets generation using cryptographically secure methods
- Validation to prevent directory traversal attacks
- Proper handling of environment variables

## [1.1.0] - 2025-11-17

### Added
- ✨ **Interactive Mode** - Run without arguments for guided setup
- 🎯 **Project Name Prompt** - Interactive project name input with validation
- 📦 **Package Manager Selection** - Choose from npm, pnpm, yarn, or bun with auto-detection
- 🔧 **Setup Preferences** - Interactive prompts for git and dependency installation
- 🔑 **Automatic JWT Secret Generation** - No need for manual `openssl` commands
- 🗄️ **Database URL Prompt** - Guided PostgreSQL connection string input
- 📊 **Interactive Database Setup** - Automatic Prisma generate, migrate, and seed
- 🚀 **Dev Server Auto-start** - Option to start development server immediately
- 🎨 **Enhanced User Experience** - Beautiful prompts with defaults and validation
- 📝 **Post-Setup Workflow** - Complete end-to-end interactive configuration
- `--yes` flag - Skip all prompts for CI/CD and automation

### Changed
- Made `app-name` argument optional (prompts if not provided)
- Updated CLI description to emphasize "Prisma + PostgreSQL"
- Improved success messages with interactive setup flow
- Enhanced documentation with interactive mode examples
- Updated README with two setup options (interactive vs manual)
- Reorganized post-creation instructions for clarity

### Dependencies
- Added `inquirer@^8.2.7` for interactive prompts

### Documentation
- Added INTERACTIVE_SETUP.md - Comprehensive interactive mode guide
- Updated README.md with interactive mode section
- Updated QUICK_REFERENCE.md with new commands
- Added example interactive session outputs

## [Unreleased]

### Planned
- Support for custom templates
- Progress indicators for long-running operations
- Template customization wizard
- Automatic Docker setup option
- CI/CD configuration templates

---

## Version History

- **1.1.0** - Added interactive mode and post-setup automation (2025-11-17)
- **1.0.0** - Major refactor with comprehensive improvements (2025-11-16)
- **0.1.0** - Initial basic version (pre-refactor)
