import { config } from 'dotenv';
import path from 'node:path';

// Both unit and e2e tests load .env.test (separate DB + Redis index from
// dev, see .env.test) instead of the root .env, so running the suite never
// touches or depends on local dev data.
config({ path: path.resolve(__dirname, '../../../.env.test') });
