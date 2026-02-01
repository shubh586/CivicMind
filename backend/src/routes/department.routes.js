import express from 'express';
import { query } from '../config/database.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();


router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { active_only } = req.query;

    let sql = `
    SELECT 
      d.*,
      COUNT(c.id) FILTER (WHERE c.status NOT IN ('resolved', 'closed')) as open_complaints,
      COUNT(c.id) as total_complaints
    FROM departments d
    LEFT JOIN complaints c ON d.id = c.department_id
  `;

    if (active_only === 'true') {
        sql += ' WHERE d.is_active = true';
    }

    sql += ' GROUP BY d.id ORDER BY d.name';

    const result = await query(sql);

    res.json({
        success: true,
        data: result.rows
    });
}));


router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const result = await query(`
    SELECT 
      d.*,
      COUNT(c.id) FILTER (WHERE c.status NOT IN ('resolved', 'closed')) as open_complaints,
      COUNT(c.id) as total_complaints,
      ROUND(AVG(
        CASE 
          WHEN c.resolved_at IS NOT NULL 
          THEN EXTRACT(EPOCH FROM (c.resolved_at - c.created_at)) / 86400
          ELSE NULL
        END
      )::numeric, 1) as avg_resolution_days
    FROM departments d
    LEFT JOIN complaints c ON d.id = c.department_id
    WHERE d.id = $1
    GROUP BY d.id
  `, [parseInt(req.params.id)]);

    if (result.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: 'Department not found'
        });
    }

    res.json({
        success: true,
        data: result.rows[0]
    });
}));

/**
 * @route   POST /api/departments
 * @desc    Create a new department
 * @access  Private (Admin only)
 */
router.post('/',
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { name, description, sla_days, contact_email, is_active } = req.body;

        if (!name) {
            return res.status(400).json({
                success: false,
                error: 'Department name is required'
            });
        }

        const result = await query(`
      INSERT INTO departments (name, description, sla_days, contact_email, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [name, description || null, sla_days || 7, contact_email || null, is_active !== false]);

        res.status(201).json({
            success: true,
            data: result.rows[0]
        });
    })
);


router.put('/:id',
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { name, description, sla_days, contact_email, is_active } = req.body;

        const result = await query(`
      UPDATE departments
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          sla_days = COALESCE($3, sla_days),
          contact_email = COALESCE($4, contact_email),
          is_active = COALESCE($5, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, description, sla_days, contact_email, is_active, parseInt(req.params.id)]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Department not found'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    })
);


router.delete('/:id',
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        // Soft delete - just mark as inactive
        const result = await query(`
      UPDATE departments
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [parseInt(req.params.id)]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Department not found'
            });
        }

        res.json({
            success: true,
            message: 'Department deactivated',
            data: result.rows[0]
        });
    })
);

export default router;
