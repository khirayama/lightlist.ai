// Unit test setup - no database required
import { config } from 'dotenv';
import path from 'path';

// Load test environment variables
config({ path: path.resolve(__dirname, '../../.env.test') });

// Set NODE_ENV for unit tests
process.env.NODE_ENV = 'test';