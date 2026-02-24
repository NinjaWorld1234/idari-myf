import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.js';

export const organizationsRouter = Router();

// Only Managers can manage organization-level details
organizationsRouter.use(authenticate, authorize(['MANAGER']));

// Get current organization details
organizationsRouter.get('/current', async (req: AuthRequest, res) => {
    try {
        const org = await prisma.organization.findUnique({
            where: { id: req.user?.organizationId },
            include: { settings: true }
        });

        if (!org) {
            return res.status(404).json({ error: 'المؤسسة غير موجودة' });
        }

        res.json(org);
    } catch (error) {
        console.error('Get organization error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل بيانات المؤسسة' });
    }
});

// Update organization details
organizationsRouter.put('/current', async (req: AuthRequest, res) => {
    try {
        const { name, logoUrl } = req.body;

        const updated = await prisma.organization.update({
            where: { id: req.user?.organizationId },
            data: { name, logoUrl }
        });

        res.json(updated);
    } catch (error) {
        console.error('Update organization error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات المؤسسة' });
    }
});
