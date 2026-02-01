import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

import { createTables, dropTables } from './001_initial_schema.js';
import { pool } from '../src/config/database.js';

const runMigrations = async () => {
    const args = process.argv.slice(2);

    try {
        if (args.includes('--drop')) {
            await dropTables();
        }

        if (args.includes('--fresh')) {
            await dropTables();
            await createTables();
        } else if (!args.includes('--drop')) {
            await createTables();
        }

    } catch (error) {
        console.error('Migration error:', error);
        process.exit(1);
    } finally {
        await pool.end();
        process.exit(0);
    }
};

runMigrations();
