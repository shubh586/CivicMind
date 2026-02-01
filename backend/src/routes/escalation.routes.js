import express from 'express';
import { query } from '../config/database.js';
import slaService from '../services/sla.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();


router.get('/',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20 } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const result = await query(`
      SELECT 
        e.*,
        c.text as complaint_text,
        c.category,
        c.urgency,
        c.status as complaint_status,
        df.name as escalated_from_name,
        dt.name as escalated_to_name
      FROM escalations e
      JOIN complaints c ON e.complaint_id = c.id
      LEFT JOIN departments df ON e.escalated_from = df.id
      LEFT JOIN departments dt ON e.escalated_to = dt.id
      ORDER BY e.created_at DESC
      LIMIT $1 OFFSET $2
    `, [parseInt(limit), offset]);

        const countResult = await query('SELECT COUNT(*) as total FROM escalations');

        res.json({
            success: true,
            data: {
                escalations: result.rows,
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


router.get('/breached',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        const breached = await slaService.findBreachedComplaints();

        res.json({
            success: true,
            data: breached
        });
    })
);


router.get('/approaching',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        const { hours = 24 } = req.query;
        const approaching = await slaService.getApproachingDeadline(parseInt(hours));

        res.json({
            success: true,
            data: approaching
        });
    })
);


router.get('/stats',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        // Filter by department for reviewers
        const departmentId = (req.user.role !== 'admin') ? req.user.department_id : null;
        const stats = await slaService.getStatistics(departmentId);

        res.json({
            success: true,
            data: stats
        });
    })
);


router.post('/trigger/:complaintId',
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const complaintId = parseInt(req.params.complaintId);

        // Get complaint
        const complaintResult = await query(`
      SELECT 
        c.*,
        d.name as department_name,
        d.sla_days as original_sla
      FROM complaints c
      JOIN departments d ON c.department_id = d.id
      WHERE c.id = $1
    `, [complaintId]);

        if (complaintResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Complaint not found'
            });
        }

        const complaint = complaintResult.rows[0];

        if (complaint.status === 'escalated') {
            return res.status(400).json({
                success: false,
                error: 'Complaint is already escalated'
            });
        }

        // Add extra fields needed for escalation
        complaint.days_overdue = 0;
        complaint.total_age_days = Math.ceil(
            (Date.now() - new Date(complaint.created_at).getTime()) / 86400000
        );

        const result = await slaService.escalateComplaint(complaint);

        res.json({
            success: true,
            data: result
        });
    })
);

export default router;
