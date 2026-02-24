import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { config } from './config.js';
import { authRouter } from './routes/auth.js';
import { membersRouter } from './routes/members.js';
import { transactionsRouter } from './routes/transactions.js';
import { reportsRouter } from './routes/reports.js';
import { settingsRouter } from './routes/settings.js';
import { usersRouter } from './routes/users.js';
import { organizationsRouter } from './routes/organizations.js';
import { financialMediaRouter } from './routes/financialMedia.js';
import { subscriptionTypesRouter } from './routes/subscriptionTypes.js';

export const prisma = new PrismaClient();

const app = express();

// Middleware
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '50mb' }));

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/members', membersRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/financial-media', financialMediaRouter);
app.use('/api/subscription-types', subscriptionTypesRouter);

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'حدث خطأ في الخادم', details: err.message });
});

// Start server
const start = async () => {
    try {
        await prisma.$connect();
        console.log('✅ Connected to database');

        app.listen(config.port, () => {
            console.log(`🚀 Server running on port ${config.port}`);
            console.log(`📡 API: http://localhost:${config.port}/api`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
};

start();
