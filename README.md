# Simple Go Web App

A minimal Go web application with database support, migrations, and comprehensive testing.

## Features

- Simple HTTP server with template rendering
- PostgreSQL database connection
- Database migrations system
- Environment variable configuration
- Comprehensive test coverage

## Setup

### Environment Configuration

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your database configuration:
```
DATABASE_URL=postgres://user:password@localhost:5432/yourdb?sslmode=disable
```

### Database Setup

The application will automatically run migrations on startup. Make sure your PostgreSQL database exists and is accessible.

## Running the Application

```bash
# Build and run
go build .
./allanswebterminal

# Or run directly
go run .

# if needed:
kill $(lsof -ti:8080)
```

The application will be available at http://localhost:8080

## Testing

### Basic Tests (without database)
```bash
go test ./...
```

### Integration Tests (with database)

Set up a test database and configure the test environment:
```bash
# Copy test environment template
cp .env.test.example .env.test

# Edit .env.test with your test database URL
# TEST_DATABASE_URL=postgres://user:password@localhost:5432/allanswebterminal_test?sslmode=disable
```

Run tests with database integration:
```bash
# Load test environment and run tests
export $(cat .env.test | xargs)
go test -v ./...
```

Or use the provided script:
```bash
./run-tests.sh
```

### Coverage Reports

Generate coverage reports:
```bash
# Generate coverage profile
go test -coverprofile=coverage.out ./...

# View coverage summary
go tool cover -func=coverage.out

# Generate HTML coverage report
go tool cover -html=coverage.out -o coverage.html
```

### Test Migration Functions

To test database migration functions, you need:

1. A test PostgreSQL database
2. `TEST_DATABASE_URL` environment variable set
3. Run the integration tests:

```bash
# Set test database URL
export TEST_DATABASE_URL="postgres://user:password@localhost:5432/allanswebterminal_test?sslmode=disable"

# Run database tests
go test -v ./db

# Run all tests with coverage
go test -coverprofile=coverage.out -v ./...
```

Without `TEST_DATABASE_URL`, migration tests will be skipped.

## Project Structure

```
.
├── db/
│   ├── connection.go      # Database connection logic
│   ├── connection_test.go # Connection tests
│   ├── migrations.go      # Migration system
│   └── migrations_test.go # Migration integration tests
├── static/
│   └── style.css         # CSS styles
├── templates/
│   └── home.html         # HTML template
├── main.go               # Main application
├── main_test.go          # HTTP handler tests
├── .env.example          # Environment variables example
├── .env.test             # Test environment variables
└── run-tests.sh          # Test runner script
```

## Coverage

Current test coverage can be viewed by running:
```bash
go test -coverprofile=coverage.out ./... && go tool cover -func=coverage.out
```

To achieve higher coverage for migration functions, ensure you have a test database configured.

## Frontend Testing

This project includes comprehensive JavaScript testing using Mocha and Chai.

### Running Frontend Tests

```bash
# Run all JavaScript tests
npm test

# Run tests with verbose output
npm test -- --reporter spec

# Run specific test file
npx mocha --require test/setup.js test/app.test.js
```

### Frontend Test Coverage

To generate frontend test coverage, install nyc:

```bash
# Install nyc for coverage
npm install --save-dev nyc

# Run tests with coverage
npx nyc npm test

# Generate HTML coverage report
npx nyc --reporter=html npm test
```

The coverage report will be generated in `coverage/index.html`.

### Frontend Test Structure

The JavaScript tests are organized into:

- `test/app.test.js` - Core utility function tests
- `test/validation.test.js` - Form validation function tests
- `test/setup.js` - Test environment configuration with jsdom

**Test Features:**
- Modal management functions
- Email and field validation
- Form data extraction and validation
- DOM manipulation testing
- Comprehensive error handling

**Current Frontend Test Coverage:**
- 22 passing tests
- Tests cover all utility functions
- Mock DOM environment with jsdom
- Comprehensive form validation testing