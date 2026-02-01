import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
    console.log('Created uploads directory');
}

// Middleware
import { errorHandler, notFound } from './middleware/error.middleware.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import complaintRoutes from './routes/complaint.routes.js';
import departmentRoutes from './routes/department.routes.js';
import routingRoutes from './routes/routing.routes.js';
import reviewRoutes from './routes/review.routes.js';
import escalationRoutes from './routes/escalation.routes.js';

// Jobs
import slaCheckerJob from './jobs/slaChecker.js';

// Database
import { pool } from './config/database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static('uploads'));

// Request logging in development
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
        next();
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        slaChecker: slaCheckerJob.getStats()
    });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/routing-rules', routingRoutes);
app.use('/api/review-queue', reviewRoutes);
app.use('/api/escalations', escalationRoutes);

// API documentation
app.get('/api', (req, res) => {
    res.json({
        name: 'Grievance Intelligence System API',
        version: '1.0.0',
        description: 'GenAI-powered complaint classification and routing system',
        endpoints: {
            auth: {
                'POST /api/auth/register': 'Register new user',
                'POST /api/auth/login': 'Login user',
                'GET /api/auth/me': 'Get current user',
                'PUT /api/auth/password': 'Change password'
            },
            complaints: {
                'POST /api/complaints': 'Submit a complaint',
                'POST /api/complaints/batch': 'Batch upload via CSV',
                'GET /api/complaints': 'List complaints',
                'GET /api/complaints/stats': 'Get statistics',
                'GET /api/complaints/:id': 'Get complaint by ID',
                'PATCH /api/complaints/:id/status': 'Update status',
                'POST /api/complaints/classify': 'Test classification'
            },
            departments: {
                'GET /api/departments': 'List departments',
                'POST /api/departments': 'Create department',
                'PUT /api/departments/:id': 'Update department',
                'DELETE /api/departments/:id': 'Delete department'
            },
            routing: {
                'GET /api/routing-rules': 'List routing rules',
                'POST /api/routing-rules': 'Create routing rule',
                'PUT /api/routing-rules/:id': 'Update routing rule',
                'DELETE /api/routing-rules/:id': 'Delete routing rule',
                'POST /api/routing-rules/test': 'Test routing'
            },
            review: {
                'GET /api/review-queue': 'Get review queue',
                'GET /api/review-queue/stats': 'Get review stats',
                'POST /api/review-queue/:id/approve': 'Approve classification',
                'POST /api/review-queue/:id/override': 'Override classification'
            },
            escalations: {
                'GET /api/escalations': 'List escalations',
                'GET /api/escalations/breached': 'Get breached complaints',
                'GET /api/escalations/approaching': 'Get approaching deadlines',
                'GET /api/escalations/stats': 'Get SLA stats',
                'POST /api/escalations/trigger/:id': 'Manually escalate'
            }
        }
    });
});

// 404 handler
app.use(notFound);

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('Database connected');

        // Start SLA checker job
        slaCheckerJob.start();

        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 Grievance Intelligence System Backend                    ║
║                                                               ║
║   Server running on: http://localhost:${PORT}                  ║
║   API Documentation: http://localhost:${PORT}/api              ║
║   Health Check:      http://localhost:${PORT}/health           ║
║                                                               ║
║   Environment: ${process.env.NODE_ENV || 'development'}                               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
        });

    } catch (error) {
        console.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

startServer();

export default app;
