import { query, getClient } from '../config/database.js';
import classificationService from './classification.service.js';
import routingService from './routing.service.js';
import explanationService from './explanation.service.js';
import slaService from './sla.service.js';

/**
 * Complaint Service
 * Handles the full complaint lifecycle
 */
class ComplaintService {

    async processComplaint(data) {
        const { text, userId, location, imageUrl } = data;
        const client = await getClient();

        try {
            await client.query('BEGIN');

            // 1. Classify the complaint using LLM
            console.log('🔍 Classifying complaint...');
            const classification = await classificationService.classifyComplaint(text);
            console.log('Classification:', classification);

            // Use provided location if available, otherwise use LLM inferred location
            const finalLocation = location || classification.location;

            // 2. Route to appropriate department
            console.log('🛣️ Routing complaint...');
            const routing = await routingService.findDepartment(classification);
            console.log('Routing:', routing);

            // 3. Calculate SLA deadline
            const slaDeadline = await slaService.calculateDeadline(
                routing.departmentId,
                classification.urgency
            );

            // 4. Generate routing explanation
            console.log('📝 Generating explanation...');
            const explanation = await explanationService.generateRoutingExplanation({
                complaintText: text,
                category: classification.category,
                urgency: classification.urgency,
                location: finalLocation,
                department: routing.departmentName,
                confidence: classification.confidence,
                routingRule: routing.ruleDescription
            });

            // 5. Insert complaint
            const complaintResult = await client.query(`
        INSERT INTO complaints (
          user_id, text, category, urgency, location, intent,
          department_id, status, explanation, confidence_score,
          assigned_by, sla_deadline, image_url
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `, [
                userId || null,
                text,
                classification.category,
                classification.urgency,
                finalLocation,
                classification.intent,
                routing.departmentId,
                classification.needsReview ? 'pending' : 'assigned',
                explanation,
                classification.confidence,
                'llm',
                slaDeadline,
                imageUrl || null
            ]);

            const complaint = complaintResult.rows[0];

            // 6. If low confidence, add to manual review queue
            if (classification.needsReview) {
                console.log('⚠️ Low confidence - flagging for manual review');

                const reviewReason = await explanationService.generateReviewFlagExplanation({
                    complaintText: text,
                    confidence: classification.confidence,
                    category: classification.category,
                    reasoning: classification.reasoning
                });

                await client.query(`
          INSERT INTO manual_review_queue (
            complaint_id, flagged_reason, original_category, 
            original_department_id, original_urgency
          )
          VALUES ($1, $2, $3, $4, $5)
        `, [
                    complaint.id,
                    reviewReason,
                    classification.category,
                    routing.departmentId,
                    classification.urgency
                ]);
            }

            // 7. Create audit log
            await client.query(`
        INSERT INTO audit_logs (entity_type, entity_id, action, new_value, performed_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [
                'complaint',
                complaint.id,
                'created',
                JSON.stringify({
                    category: classification.category,
                    urgency: classification.urgency,
                    department: routing.departmentName,
                    confidence: classification.confidence,
                    flaggedForReview: classification.needsReview
                }),
                userId || null
            ]);

            await client.query('COMMIT');

            return {
                complaint,
                classification,
                routing: {
                    departmentId: routing.departmentId,
                    departmentName: routing.departmentName,
                    slaDays: routing.slaDays,
                    deadline: slaDeadline
                },
                explanation,
                flaggedForReview: classification.needsReview
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Complaint processing error:', error.message);
            throw error;
        } finally {
            client.release();
        }
    }


    async getComplaintById(id) {
        const result = await query(`
      SELECT 
        c.*,
        d.name as department_name,
        d.sla_days,
        d.contact_email as department_email,
        u.email as user_email,
        u.name as user_name,
        mrq.flagged_reason,
        mrq.override_status as review_status,
        mrq.override_notes as review_notes
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN manual_review_queue mrq ON c.id = mrq.complaint_id
      WHERE c.id = $1
    `, [id]);

        return result.rows[0] || null;
    }

    /**
     * Get all complaints with filters
     * @param {Object} filters - Filter options
     * @returns {Promise<Array>} - Filtered complaints
     */
    async getComplaints(filters = {}) {
        const { status, category, urgency, department_id, user_id, page = 1, limit = 20 } = filters;

        let whereConditions = [];
        let params = [];
        let paramIndex = 1;

        if (status) {
            whereConditions.push(`c.status = $${paramIndex++}`);
            params.push(status);
        }
        if (category) {
            whereConditions.push(`c.category = $${paramIndex++}`);
            params.push(category);
        }
        if (urgency) {
            whereConditions.push(`c.urgency = $${paramIndex++}`);
            params.push(urgency);
        }
        if (department_id) {
            whereConditions.push(`c.department_id = $${paramIndex++}`);
            params.push(department_id);
        }
        if (user_id) {
            whereConditions.push(`c.user_id = $${paramIndex++}`);
            params.push(user_id);
        }
        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        const offset = (page - 1) * limit;

        const result = await query(`
      SELECT 
        c.*,
        d.name as department_name,
        u.email as user_email
      FROM complaints c
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN users u ON c.user_id = u.id
      ${whereClause}
      ORDER BY c.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex}
    `, [...params, limit, offset]);

        // Get total count
        const countResult = await query(`
      SELECT COUNT(*) as total
      FROM complaints c
      ${whereClause}
    `, params);

        return {
            complaints: result.rows,
            pagination: {
                page,
                limit,
                total: parseInt(countResult.rows[0].total),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        };
    }


    async updateStatus(id, status, userId) {
        const client = await getClient();

        try {
            await client.query('BEGIN');

            // Get current state
            const current = await client.query(
                'SELECT * FROM complaints WHERE id = $1',
                [id]
            );

            if (current.rows.length === 0) {
                throw new Error('Complaint not found');
            }

            const oldStatus = current.rows[0].status;

            // Update
            const updateData = {
                status,
                updated_at: new Date()
            };

            if (status === 'resolved') {
                updateData.resolved_at = new Date();
            }

            const result = await client.query(`
        UPDATE complaints
        SET status = $1::varchar, 
            updated_at = CURRENT_TIMESTAMP,
            resolved_at = CASE WHEN $1::varchar = 'resolved' THEN CURRENT_TIMESTAMP ELSE resolved_at END
        WHERE id = $2
        RETURNING *
      `, [status, id]);

            // Audit log
            await client.query(`
        INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, performed_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
                'complaint',
                id,
                'status_changed',
                JSON.stringify({ status: oldStatus }),
                JSON.stringify({ status }),
                userId
            ]);

            await client.query('COMMIT');

            return result.rows[0];

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }


    async getDashboardStats(departmentId = null) {
        let queryText = `
      SELECT 
        COUNT(*) as total_complaints,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE status = 'assigned') as assigned_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'escalated') as escalated_count,
        COUNT(*) FILTER (WHERE assigned_by = 'llm') as ai_assigned_count,
        COUNT(*) FILTER (WHERE assigned_by = 'manual') as manual_assigned_count,
        ROUND(AVG(confidence_score)::numeric, 2) as avg_confidence
      FROM complaints
    `;

        const params = [];
        if (departmentId) {
            queryText += ' WHERE department_id = $1';
            params.push(departmentId);
        }

        const stats = await query(queryText, params);

        const categoryStats = await query(`
      SELECT category, COUNT(*) as count
      FROM complaints
      GROUP BY category
      ORDER BY count DESC
      LIMIT 10
    `);

        const urgencyStats = await query(`
      SELECT urgency, COUNT(*) as count
      FROM complaints
      GROUP BY urgency
    `);

        const slaStats = await slaService.getStatistics();

        return {
            overview: stats.rows[0],
            byCategory: categoryStats.rows,
            byUrgency: urgencyStats.rows,
            sla: slaStats
        };
    }
}

export default new ComplaintService();
