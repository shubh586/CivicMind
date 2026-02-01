import { getClient } from '../src/config/database.js';

const up = async () => {
    const client = await getClient();
    try {
        console.log('Adding image_url column to complaints table...');
        await client.query(`
            ALTER TABLE complaints 
            ADD COLUMN IF NOT EXISTS image_url TEXT;
        `);
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        throw error;
    } finally {
        client.release();
    }
};

up().catch(console.error);
