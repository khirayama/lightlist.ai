// Unit test setup - no database required
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables for unit tests
config({ path: path.resolve(__dirname, '../../.env.test') });

// Set NODE_ENV for unit tests
process.env.NODE_ENV = 'test';

// Unit tests setup - no database dependencies
// This file is used for tests that don't require database connections
// such as utility functions, JWT operations, password hashing, validation, etc.
// Unit tests should be isolated and stateless - no beforeAll, beforeEach, or afterAll hooks needed