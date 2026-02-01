import { getClient } from '../src/config/database.js';

const seedDummyData = async () => {
    const client = await getClient();
    try {
        console.log('🌱 Seeding dummy data for dashboard stats...');

      
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

        // get user ID (citizen) - assumig ID 1 or find one
        const userRes = await client.query("SELECT id FROM users WHERE role = 'citizen' LIMIT 1");
        const userId = userRes.rows.length > 0 ? userRes.rows[0].id : null;

        // Get department IDs
        const sanitationRes = await client.query("SELECT id FROM departments WHERE name = 'Sanitation'");
        const sanitationId = sanitationRes.rows[0]?.id;

        if (!userId || !sanitationId) {
            console.log('Skipping dummy data: User or Department not found.');
            return;
        }

        // 1. Create a BREACHED complaint (SLA deadline was yesterday)
        await client.query(`
            INSERT INTO complaints (
                user_id, text, category, urgency, location, intent,
                department_id, status, explanation, confidence_score,
                assigned_by, sla_deadline, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
            userId, 'Garbage not collected for 2 weeks in Dharampeth.', 'Waste Management', 'high', 'Dharampeth', 'Complaint',
            sanitationId, 'in_progress', 'dummy explanation', 0.95,
            'llm', yesterday, twoDaysAgo
        ]);
        console.log('Created BREACHED complaint');

        // 2. Create a PENDING REVIEW complaint (in manual_review_queue)
        const reviewRes = await client.query(`
            INSERT INTO complaints (
                user_id, text, category, urgency, location, intent,
                department_id, status, explanation, confidence_score,
                assigned_by, sla_deadline, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING id
        `, [
            userId, 'Vague complaint about smell.', 'Unclear', 'low', 'Unknown', 'Complaint',
            sanitationId, 'pending', 'dummy explanation', 0.45,
            'llm', tomorrow, now
        ]);
        const reviewId = reviewRes.rows[0].id;

        await client.query(`
             INSERT INTO manual_review_queue (
                complaint_id, flagged_reason, original_category, 
                original_department_id, original_urgency
            ) VALUES ($1, $2, $3, $4, $5)
        `, [reviewId, 'Low confidence score', 'Unclear', sanitationId, 'low']);
        console.log('Created PENDING REVIEW complaint');

        // 3. Create an APPROACHING DEADLINE complaint (deadline is tomorrow)
        await client.query(`
            INSERT INTO complaints (
                user_id, text, category, urgency, location, intent,
                department_id, status, explanation, confidence_score,
                assigned_by, sla_deadline, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
            userId, 'Overflowing bin near market.', 'Waste Management', 'medium', 'Sitabuldi', 'Complaint',
            sanitationId, 'assigned', 'dummy explanation', 0.85,
            'llm', tomorrow, now
        ]);
        console.log('Created APPROACHING DEADLINE complaint');

    } catch (error) {
        console.error('Failed to seed dummy data:', error);
    } finally {
        client.release();
    }
};

seedDummyData();
