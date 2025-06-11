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
├── modules/
│   ├── auth/           # Authentication module
│   │   ├── dto/        # Data Transfer Objects
│   │   ├── interfaces/ # TypeScript interfaces
│   │   └── auth.service.ts
│   └── users/          # User management module
│       ├── dto/        # Data Transfer Objects
│       ├── entities/   # TypeORM entities
│       ├── enums/      # Enumerations
│       ├── interfaces/ # TypeScript interfaces
│       └── users.service.ts
├── shared/             # Shared utilities and constants
│   ├── database/       # Database configuration
│   ├── decorators/     # Custom decorators
│   ├── entity/         # Base entities
│   ├── filters/        # Exception filters
│   ├── guards/         # Authentication guards
│   └── interfaces/     # Shared interfaces
├── utils/              # Utility functions
└── app.module.ts       # Root application module
```

## Technology Stack

- **NestJS** - Progressive Node.js framework ([https://nestjs.com](https://nestjs.com))
- **TypeORM** - Database ORM with PostgreSQL ([https://typeorm.io](https://typeorm.io))
- **PostgreSQL** - Primary database ([https://www.postgresql.org](https://www.postgresql.org))
- **TypeScript** - Programming language ([https://www.typescriptlang.org](https://www.typescriptlang.org))
- **Class Validator** - Data validation ([https://github.com/typestack/class-validator](https://github.com/typestack/class-validator))
- **JWT** - Authentication ([https://jwt.io](https://jwt.io))
- **Swagger/OpenAPI** - API documentation ([https://swagger.io](https://swagger.io))

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Yarn package manager
- PostgreSQL database

### Installation

1. **Clone the repository:**

```bash
git clone <repository-url>
cd ires-backend-v1
```

2. **Install dependencies:**

```bash
yarn install
```

3. **Environment Configuration:**

Create a `.env` file in the root directory by copying the example:

```bash
cp env.example .env
```

Then configure the following environment variables:

```env
# =============================================================================
# Application Environment
# =============================================================================
NODE_ENV=development

# =============================================================================
# Database Configuration
# =============================================================================
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASS=your_database_password
DB_NAME=ires_db
DB_TYPE=postgres

# =============================================================================
# JWT Authentication
# =============================================================================
JWT_TOKEN_SECRET=your_jwt_secret_key_here_make_it_long_and_random
REFRESH_TOKEN_SECRET=your_refresh_token_secret_key_here_make_it_long_and_random

# =============================================================================
# Super Admin Default Configuration
# =============================================================================
DEFAULT_SUPER_ADMIN_EMAIL=admin@ires.com
DEFAULT_SUPER_ADMIN_PASSWORD=SuperAdmin123!
DEFAULT_SUPER_ADMIN_FIRST_NAME=Super
DEFAULT_SUPER_ADMIN_LAST_NAME=Admin
```

**Important Notes:**
- Replace all placeholder values with your actual configuration
- Use strong, unique passwords and secrets in production
- Consider using a secrets management service for production
- The seeder script will create a super admin user using the default values
- Database will be automatically created if it doesn't exist (in development)

## API Documentation

Once the server is running, you can access the Swagger API documentation at:

```
http://{{origin}}/api
```

## Available Scripts

```bash
# Development
yarn start:dev          # Start development server with hot reload
yarn start:debug        # Start with debug mode
yarn start:prod         # Start production server

# Building
yarn build              # Build the application
yarn clean              # Clean build artifacts

# Testing
yarn test               # Run unit tests
yarn test:watch         # Run tests in watch mode
yarn test:cov           # Run tests with coverage
yarn test:e2e           # Run end-to-end tests

# Code Quality
yarn lint               # Run ESLint
yarn format             # Format code with Prettier

# Database
yarn seed               # Run database seeder
```

## Security Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - bcrypt for secure password storage
- **Helmet** - Security headers middleware
- **Input Validation** - Class-validator for request validation
- **Role-based Access Control** - Granular permission system

## License

This project is licensed under the MIT License - see the LICENSE file for details.
