import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse';
import { Readable } from 'stream';
import complaintService from '../services/complaint.service.js';
import classificationService from '../services/classification.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { authenticate, authorize, optionalAuth } from '../middleware/auth.middleware.js';

const router = express.Router();


// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = file.originalname.split('.').pop();
        cb(null, file.fieldname + '-' + uniqueSuffix + '.' + ext)
    }
});

const uploadImage = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

router.post('/', optionalAuth, uploadImage.single('image'), asyncHandler(async (req, res) => {
    const { text, location } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!text || text.trim().length < 10) {
        return res.status(400).json({
            success: false,
            error: 'Complaint text must be at least 10 characters long'
        });
    }

    const result = await complaintService.processComplaint({
        text: text.trim(),
        userId: req.user?.id || null,
        location,
        imageUrl: imagePath
    });

    res.status(201).json({
        success: true,
        data: {
            complaint: result.complaint,
            classification: {
                category: result.classification.category,
                urgency: result.classification.urgency,
                location: result.classification.location,
                intent: result.classification.intent,
                confidence: result.classification.confidence
            },
            routing: result.routing,
            explanation: result.explanation,
            flaggedForReview: result.flaggedForReview
        }
    });
}));


const uploadCsv = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});


router.post('/batch',
    authenticate,
    authorize('admin', 'reviewer'),
    uploadCsv.single('file'),
    asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'CSV file is required'
            });
        }

        const results = {
            total: 0,
            processed: 0,
            failed: 0,
            complaints: []
        };

        // Parse CSV
        const records = [];
        const parser = Readable.from(req.file.buffer).pipe(
            parse({
                columns: true,
                skip_empty_lines: true,
                trim: true
            })
        );

        for await (const record of parser) {
            records.push(record);
        }

        results.total = records.length;

        // Process each complaint
        for (const record of records) {
            const text = record.complaint || record.text || record.description;

            if (!text || text.trim().length < 10) {
                results.failed++;
                results.complaints.push({
                    text: text || 'No text',
                    status: 'failed',
                    error: 'Invalid complaint text'
                });
                continue;
            }

            try {
                const result = await complaintService.processComplaint({
                    text: text.trim(),
                    userId: req.user.id
                });

                results.processed++;
                results.complaints.push({
                    id: result.complaint.id,
                    text: text.substring(0, 100),
                    status: 'processed',
                    category: result.classification.category,
                    department: result.routing.departmentName,
                    confidence: result.classification.confidence
                });

            } catch (error) {
                results.failed++;
                results.complaints.push({
                    text: text.substring(0, 100),
                    status: 'failed',
                    error: error.message
                });
            }
        }

        res.json({
            success: true,
            data: results
        });
    })
);


router.get('/', authenticate, asyncHandler(async (req, res) => {
    const { status, category, urgency, department_id, page, limit } = req.query;

    // For reviewers with department_id, auto-filter to their department
    let filterDepartmentId = department_id ? parseInt(department_id) : undefined;
    if (req.user.role === 'reviewer' && req.user.department_id) {
        filterDepartmentId = req.user.department_id;
    }
    // Citizens only see their own complaints (handled in service)
    const userId = req.user.role === 'citizen' ? req.user.id : undefined;

    const result = await complaintService.getComplaints({
        status,
        category,
        urgency,
        department_id: filterDepartmentId,
        user_id: userId,
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20
    });

    res.json({
        success: true,
        data: result
    });
}));


router.get('/stats', authenticate, asyncHandler(async (req, res) => {
    // Filter by department for reviewers
    const departmentId = (req.user.role !== 'admin') ? req.user.department_id : null;
    const stats = await complaintService.getDashboardStats(departmentId);

    res.json({
        success: true,
        data: stats
    });
}));

router.get('/:id', authenticate, asyncHandler(async (req, res) => {
    const complaint = await complaintService.getComplaintById(parseInt(req.params.id));

    if (!complaint) {
        return res.status(404).json({
            success: false,
            error: 'Complaint not found'
        });
    }

    res.json({
        success: true,
        data: complaint
    });
}));


router.patch('/:id/status',
    authenticate,
    authorize('admin', 'reviewer'),
    asyncHandler(async (req, res) => {
        const { status } = req.body;

        const validStatuses = ['pending', 'assigned', 'in_progress', 'resolved', 'closed'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }



        const complaint = await complaintService.updateStatus(
            parseInt(req.params.id),
            status,
            req.user.id
        );

        res.json({
            success: true,
            data: complaint
        });
    })
);


router.post('/classify',
    authenticate,
    authorize('admin'),
    asyncHandler(async (req, res) => {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                success: false,
                error: 'Complaint text is required'
            });
        }

        const classification = await classificationService.classifyComplaint(text);

        res.json({
            success: true,
            data: classification
        });
    })
);

export default router;
