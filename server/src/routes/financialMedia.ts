import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const financialMediaRouter = Router();

financialMediaRouter.use(authenticate);

financialMediaRouter.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const media = await prisma.financialMedium.findMany({
            where: { organizationId: req.user?.organizationId }
        });
        res.json(media);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل الوسائل المالية' });
    }
});

financialMediaRouter.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const medium = await prisma.financialMedium.create({
            data: {
                ...req.body,
                organizationId: req.user?.organizationId as string
            }
        });
        res.status(201).json(medium);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ أثناء إضافة الوسيلة المالية' });
    }
});

financialMediaRouter.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const updated = await prisma.financialMedium.update({
            where: { id: req.params.id, organizationId: req.user?.organizationId as string },
            data: req.body
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الوسيلة المالية' });
    }
});

financialMediaRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        await prisma.financialMedium.delete({
            where: { id: req.params.id, organizationId: req.user?.organizationId as string }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'حدث خطأ أثناء حذف الوسيلة المالية' });
    }
});
