import express from 'express';
import { query, getClient } from '../config/database.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();


router.get('/',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        const { status = 'pending', page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Department filter: admins see all, reviewers with department_id see only theirs
        const userDepartmentId = req.user.department_id;
        const isAdmin = req.user.role === 'admin';

        let departmentFilter = '';
        const params = [status, parseInt(limit), offset];

        if (!isAdmin && userDepartmentId) {
            departmentFilter = 'AND c.department_id = $4';
            params.push(userDepartmentId);
        }

        const result = await query(`
      SELECT 
        mrq.*,
        c.text as complaint_text,
        c.category as current_category,
        c.urgency as current_urgency,
        c.department_id as current_department_id,
        c.confidence_score,
        c.status as complaint_status,
        c.created_at as complaint_created_at,
        d.name as department_name,
        od.name as original_department_name,
        u.name as reviewer_name
      FROM manual_review_queue mrq
      JOIN complaints c ON mrq.complaint_id = c.id
      LEFT JOIN departments d ON c.department_id = d.id
      LEFT JOIN departments od ON mrq.original_department_id = od.id
      LEFT JOIN users u ON mrq.reviewed_by = u.id
      WHERE mrq.override_status = $1 ${departmentFilter}
      ORDER BY c.created_at DESC
      LIMIT $2 OFFSET $3
    `, params);

        // Get total count with same filter
        const countParams = [status];
        let countDeptFilter = '';
        if (!isAdmin && userDepartmentId) {
            countDeptFilter = 'AND c.department_id = $2';
            countParams.push(userDepartmentId);
        }

        const countResult = await query(`
      SELECT COUNT(*) as total
      FROM manual_review_queue mrq
      JOIN complaints c ON mrq.complaint_id = c.id
      WHERE mrq.override_status = $1 ${countDeptFilter}
    `, countParams);

        res.json({
            success: true,
            data: {
                reviews: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: parseInt(countResult.rows[0].total),
                    pages: Math.ceil(countResult.rows[0].total / parseInt(limit))
                }
            }
        });
    })
);


router.get('/stats',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        let queryText = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE override_status = 'pending') as pending,
        COUNT(*) FILTER (WHERE override_status = 'approved') as approved,
        COUNT(*) FILTER (WHERE override_status = 'modified') as modified,
        COUNT(*) FILTER (WHERE override_status = 'rejected') as rejected
      FROM manual_review_queue mrq
      JOIN complaints c ON mrq.complaint_id = c.id
    `;

        const params = [];
        // Filter by department for reviewers
        if (req.user.role !== 'admin' && req.user.department_id) {
            queryText += ' WHERE c.department_id = $1';
            params.push(req.user.department_id);
        }

        const stats = await query(queryText, params);

        res.json({
            success: true,
            data: stats.rows[0]
        });
    })
);


router.post('/:id/approve',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        const client = await getClient();
        const { notes } = req.body;

        try {
            await client.query('BEGIN');

            // Get review item
            const review = await client.query(
                'SELECT * FROM manual_review_queue WHERE id = $1',
                [parseInt(req.params.id)]
            );

            if (review.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Review item not found'
                });
            }

            // Update review queue
            await client.query(`
        UPDATE manual_review_queue
        SET override_status = 'approved',
            reviewed_by = $1,
            override_notes = $2,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [req.user.id, notes || 'Approved as correct', parseInt(req.params.id)]);

            // Update complaint status
            await client.query(`
        UPDATE complaints
        SET status = 'assigned',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [review.rows[0].complaint_id]);

            // Audit log
            await client.query(`
        INSERT INTO audit_logs (entity_type, entity_id, action, new_value, performed_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [
                'manual_review',
                parseInt(req.params.id),
                'approved',
                JSON.stringify({ notes: notes || 'Approved as correct' }),
                req.user.id
            ]);

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Classification approved'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    })
);


router.post('/:id/override',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        const client = await getClient();
        const { category, urgency, department_id, notes } = req.body;

        try {
            await client.query('BEGIN');

            // Get review item
            const review = await client.query(`
        SELECT mrq.*, c.category as current_category, c.urgency as current_urgency, 
               c.department_id as current_department_id
        FROM manual_review_queue mrq
        JOIN complaints c ON mrq.complaint_id = c.id
        WHERE mrq.id = $1
      `, [parseInt(req.params.id)]);

            if (review.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({
                    success: false,
                    error: 'Review item not found'
                });
            }

            const oldData = review.rows[0];

            // Update complaint with overrides
            await client.query(`
        UPDATE complaints
        SET category = COALESCE($1, category),
            urgency = COALESCE($2, urgency),
            department_id = COALESCE($3, department_id),
            assigned_by = 'manual',
            status = 'assigned',
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
                category || null,
                urgency || null,
                department_id || null,
                oldData.complaint_id
            ]);

            // Update review queue
            await client.query(`
        UPDATE manual_review_queue
        SET override_status = 'modified',
            reviewed_by = $1,
            override_notes = $2,
            reviewed_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [req.user.id, notes || 'Manual override applied', parseInt(req.params.id)]);

            // Audit log
            await client.query(`
        INSERT INTO audit_logs (entity_type, entity_id, action, old_value, new_value, performed_by)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
                'manual_review',
                parseInt(req.params.id),
                'overridden',
                JSON.stringify({
                    category: oldData.current_category,
                    urgency: oldData.current_urgency,
                    department_id: oldData.current_department_id
                }),
                JSON.stringify({
                    category: category || oldData.current_category,
                    urgency: urgency || oldData.current_urgency,
                    department_id: department_id || oldData.current_department_id,
                    notes
                }),
                req.user.id
            ]);

            await client.query('COMMIT');

            res.json({
                success: true,
                message: 'Classification overridden successfully'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    })
);

export default router;
