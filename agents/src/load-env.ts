/**
 * Force load .env file with override: true
 * This ensures .env file values take precedence over shell environment variables
 */
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
config({ path: envPath, override: true });
