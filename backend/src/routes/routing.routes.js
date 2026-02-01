import express from 'express';
import routingService from '../services/routing.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();


router.get('/',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        const rules = await routingService.getAllRules();

        res.json({
            success: true,
            data: rules
        });
    })
);


router.post('/',
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { category, urgency, location, department_id, priority, is_active } = req.body;

        if (!category || !department_id) {
            return res.status(400).json({
                success: false,
                error: 'Category and department_id are required'
            });
        }

        const rule = await routingService.createRule({
            category,
            urgency,
            location,
            department_id,
            priority,
            is_active
        });

        res.status(201).json({
            success: true,
            data: rule
        });
    })
);


router.put('/:id',
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const rule = await routingService.updateRule(
            parseInt(req.params.id),
            req.body
        );

        if (!rule) {
            return res.status(404).json({
                success: false,
                error: 'Routing rule not found'
            });
        }

        res.json({
            success: true,
            data: rule
        });
    })
);


router.delete('/:id',
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const deleted = await routingService.deleteRule(parseInt(req.params.id));

        if (!deleted) {
            return res.status(404).json({
                success: false,
                error: 'Routing rule not found'
            });
        }

        res.json({
            success: true,
            message: 'Routing rule deleted'
        });
    })
);


router.post('/test',
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { category, urgency, location } = req.body;

        if (!category) {
            return res.status(400).json({
                success: false,
                error: 'Category is required for testing'
            });
        }

        const result = await routingService.findDepartment({ category, urgency, location });

        res.json({
            success: true,
            data: result
        });
    })
);

export default router;
