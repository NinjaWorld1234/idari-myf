import { Router, Response } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

export const subscriptionTypesRouter = Router();

subscriptionTypesRouter.use(authenticate);

subscriptionTypesRouter.get('/', async (req: AuthRequest, res: Response) => {
    try {
        const types = await prisma.subscriptionType.findMany({
            where: { organizationId: req.user?.organizationId }
        });
        res.json(types);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscription types' });
    }
});

subscriptionTypesRouter.post('/', async (req: AuthRequest, res: Response) => {
    try {
        const { name, amount, period } = req.body;
        const newType = await prisma.subscriptionType.create({
            data: {
                name,
                amount: Number(amount),
                period,
                organizationId: req.user?.organizationId as string
            }
        });
        res.status(201).json(newType);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create subscription type' });
    }
});

subscriptionTypesRouter.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
        const { name, amount, period } = req.body;
        const updated = await prisma.subscriptionType.update({
            where: { id: req.params.id, organizationId: req.user?.organizationId as string },
            data: {
                name,
                amount: amount !== undefined ? Number(amount) : undefined,
                period
            }
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update subscription type' });
    }
});

subscriptionTypesRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
        await prisma.subscriptionType.delete({
            where: { id: req.params.id, organizationId: req.user?.organizationId as string }
        });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete subscription type' });
    }
});
