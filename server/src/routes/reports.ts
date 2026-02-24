import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

// Dashboard statistics
reportsRouter.get('/dashboard', async (req: AuthRequest, res) => {
    try {
        const orgId = req.user?.organizationId;

        const [totalMembers, activeMembers, transactions] = await Promise.all([
            prisma.member.count({ where: { organizationId: orgId } }),
            prisma.member.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
            prisma.transaction.findMany({
                where: { organizationId: orgId },
                select: { amount: true, direction: true }
            })
        ]);

        let totalIncome = 0;
        let totalExpense = 0;

        transactions.forEach(t => {
            if (t.direction === 'IN') totalIncome += Number(t.amount);
            else totalIncome -= Number(t.amount); // Wait, direction is IN/OUT. If OUT it's expense.
            // Let's re-eval:
        });

        // Re-calculating correctly:
        const incomeTx = transactions.filter(t => t.direction === 'IN');
        const expenseTx = transactions.filter(t => t.direction === 'OUT');

        totalIncome = incomeTx.reduce((sum, t) => sum + Number(t.amount), 0);
        totalExpense = expenseTx.reduce((sum, t) => sum + Number(t.amount), 0);

        res.json({
            totalMembers,
            activeMembers,
            totalIncome,
            totalExpense,
            netBalance: totalIncome - totalExpense
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل إحصائيات لوحة التحكم' });
    }
});

// Financial summary report
reportsRouter.get('/financial', async (req: AuthRequest, res) => {
    try {
        const orgId = req.user?.organizationId;
        const { startDate, endDate } = req.query;

        const where: any = { organizationId: orgId };
        if (startDate || endDate) {
            where.date = {};
            if (startDate) where.date.gte = new Date(String(startDate));
            if (endDate) where.date.lte = new Date(String(endDate));
        }

        const transactions = await prisma.transaction.findMany({
            where,
            orderBy: { date: 'asc' }
        });

        res.json(transactions);
    } catch (error) {
        console.error('Financial report error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل التقرير المالي' });
    }
});
