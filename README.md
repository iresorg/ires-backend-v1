# IRES Backend - Cybersecurity Hotline Platform

A modular monolith backend service for managing cybersecurity incident reports and hotline operations.

## Overview

This project is built as a modular monolith using NestJS, allowing for future scalability and potential microservices migration. The modular approach provides:

- Clear separation of concerns
- Independent module development
- Easier testing and maintenance
- Flexibility to extract modules into microservices when needed

## Project Structure

```
src/
├── auth/                 # Authentication module
├── users/               # User management module
│   ├── http/           # HTTP controllers and DTOs
│   ├── domain/         # Business logic and entities
│   └── infrastructure/ # Database and external service implementations
├── shared/             # Shared utilities and constants
└── app.module.ts       # Root application module
```

## Technology Stack

- NestJS - Progressive Node.js framework
- TypeORM - Database ORM
- PostgreSQL - Primary database
- TypeScript - Programming language
- Class Validator - Data validation
- JWT - Authentication

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- PostgreSQL database

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd ires-backend-v1
```

1. Install dependencies:

```bash
yarn install
```

1. Create a `.env` file in the root directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_password
DB_NAME=ires_db
NODE_ENV=development
```

1. Start the development server:

```bash
yarn start:dev
```

## Development Workflow

### Branch Naming Convention

- Feature branches: `feature/description-of-feature`
- Bug fixes: `fix/description-of-fix`
- Hotfixes: `hotfix/description-of-hotfix`
- Documentation: `docs/description-of-docs`

### Development Process

1. Always start from the `dev` branch:

```bash
git checkout dev
git pull origin dev
```

1. Create your feature branch:

```bash
git checkout -b feature/your-feature-name
```

1. Before pushing changes:

```bash
git checkout dev
git pull origin dev
git checkout feature/your-feature-name
git merge dev
```

1. Build and test your changes:

```bash
yarn build
yarn test
```

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types:

- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Adding tests
- chore: Maintenance tasks

Example:

```
feat(auth): implement JWT authentication

- Add JWT strategy
- Implement login endpoint
- Add refresh token functionality
```

### Pull Request Guidelines

1. Create PR from your feature branch to `dev`
2. PR title should follow commit message format
3. Include description of changes
4. Link related issues
5. Ensure all tests pass
6. Request review from at least one team member

## Testing

```bash
# Unit tests
yarn test

# e2e tests
yarn test:e2e

# Test coverage
yarn test:cov
```

## Deployment

```bash
# Production build
yarn build

# Start production server
yarn start:prod
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.
