import { getClient } from '../src/config/database.js';

const checkUsers = async () => {
    const client = await getClient();
    try {
        const res = await client.query('SELECT id, email, role, department_id FROM users');
        console.table(res.rows);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.release();
    }
};

checkUsers().catch(console.error);
