import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { seedData } from './001_seed_data.js';
import { pool } from '../src/config/database.js';

const runSeeds = async () => {
    try {
        await seedData();
    } catch (error) {
        console.error('Seed error:', error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
};

runSeeds();
