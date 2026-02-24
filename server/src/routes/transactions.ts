import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.js';
import { VoucherService } from '../services/voucherService.js';

export const transactionsRouter = Router();

transactionsRouter.use(authenticate);

// Get transactions
transactionsRouter.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const { type, direction, search, memberId } = req.query;

        const where: any = {
            organizationId: req.user?.organizationId
        };

        if (type) where.type = type;
        if (direction) where.direction = direction;
        if (memberId) where.memberId = memberId;

        if (search) {
            where.OR = [
                { category: { contains: String(search), mode: 'insensitive' } },
                { description: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        const transactions = await prisma.transaction.findMany({
            where,
            include: {
                member: { select: { fullName: true, memberCode: true } },
                createdBy: { select: { name: true } }
            },
            orderBy: { date: 'desc' }
        });

        res.json(transactions);
    } catch (error) {
        console.error('List transactions error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل الحركات المالية' });
    }
});

// Create transaction
transactionsRouter.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { date, amount, type, ...rest } = req.body;

        // Generate voucher number
        const voucherNumber = await VoucherService.getNextVoucherNumber(
            req.user?.organizationId as string,
            type
        );

        const transaction = await prisma.transaction.create({
            data: {
                ...rest,
                type,
                voucherNumber,
                date: new Date(date),
                amount: Number(amount),
                organizationId: req.user?.organizationId as string,
                createdById: req.user?.id as string
            }
        });

        // Update financial medium balance
        if (rest.mediumId) {
            const factor = rest.direction === 'IN' ? 1 : -1;
            await prisma.financialMedium.update({
                where: { id: rest.mediumId },
                data: { balance: { increment: Number(amount) * factor } }
            });
        }

        // Link and update SubscriptionDue if provided
        if (type === 'SUBSCRIPTION' && rest.subscriptionDueId) {
            await prisma.subscriptionDue.update({
                where: { id: rest.subscriptionDueId },
                data: { status: 'PAID' }
            });
        }

        res.status(201).json(transaction);
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إضافة الحركة المالية' });
    }
});

// Reverse transaction
transactionsRouter.post('/:id/reverse', authorize(['MANAGER', 'ACCOUNTANT']), async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason) {
            return res.status(400).json({ error: 'سبب العكس مطلوب' });
        }

        const original = await prisma.transaction.findUnique({
            where: { id, organizationId: req.user?.organizationId }
        });

        if (!original) {
            return res.status(404).json({ error: 'الحركة الأصلية غير موجودة' });
        }

        if (original.status === 'REVERSED') {
            return res.status(400).json({ error: 'هذه الحركة تم عكسها مسبقاً' });
        }

        // Create reversal transaction
        const reversalVoucher = await VoucherService.getNextVoucherNumber(
            req.user?.organizationId as string,
            'REVERSAL'
        );

        const reversal = await prisma.transaction.create({
            data: {
                date: new Date(),
                type: 'REVERSAL',
                direction: original.direction === 'IN' ? 'OUT' : 'IN',
                amount: original.amount,
                category: `عكس: ${original.category}`,
                description: `عكس عملية رقم ${original.voucherNumber || original.id}. السبب: ${reason}`,
                paymentMethod: original.paymentMethod,
                mediumId: original.mediumId,
                memberId: original.memberId,
                status: 'ACTIVE',
                voucherNumber: reversalVoucher,
                reversalOfId: original.id,
                organizationId: req.user?.organizationId as string,
                createdById: req.user?.id as string
            }
        });

        // Mark original as reversed
        await prisma.transaction.update({
            where: { id: original.id },
            data: {
                status: 'REVERSED',
                reversalReason: reason
            }
        });

        // Update financial medium balance
        if (original.mediumId) {
            const factor = original.direction === 'IN' ? -1 : 1;
            await prisma.financialMedium.update({
                where: { id: original.mediumId },
                data: { balance: { increment: original.amount * factor } }
            });
        }

        res.status(201).json(reversal);
    } catch (error) {
        console.error('Reverse transaction error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء عكس الحركة المالية' });
    }
});

// Update transaction
transactionsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const { date, amount, ...rest } = req.body;

        const updated = await prisma.transaction.update({
            where: {
                id,
                organizationId: req.user?.organizationId
            },
            data: {
                ...rest,
                date: date ? new Date(date) : undefined,
                amount: amount ? Number(amount) : undefined
            }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update transaction error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الحركة المالية' });
    }
});

// Delete transaction - DISABLED as per accounting rules (Use Reverse instead)
transactionsRouter.delete('/:id', async (_req: AuthRequest, res: Response) => {
    res.status(405).json({ error: 'حذف الحركات المالية غير مسموح. يرجى استخدام خاصية عكس العملية.' });
});
