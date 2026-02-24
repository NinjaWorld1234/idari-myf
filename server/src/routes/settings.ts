import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.js';

export const settingsRouter = Router();

settingsRouter.use(authenticate);

// Get organization settings
settingsRouter.get('/', async (req: AuthRequest, res) => {
    try {
        const settings = await prisma.orgSettings.findUnique({
            where: { organizationId: req.user?.organizationId },
            include: { organization: true }
        });

        if (!settings) {
            return res.status(404).json({ error: 'الإعدادات غير موجودة' });
        }

        res.json(settings);
    } catch (error) {
        console.error('Get settings error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل الإعدادات' });
    }
});

// Update settings (Manager only)
settingsRouter.put('/', authorize(['MANAGER']), async (req: AuthRequest, res) => {
    try {
        const { name, logoUrl, ...rest } = req.body;
        const orgId = req.user?.organizationId as string;

        const [updatedOrg, updatedSettings] = await Promise.all([
            prisma.organization.update({
                where: { id: orgId },
                data: { name, logoUrl }
            }),
            prisma.orgSettings.update({
                where: { organizationId: orgId },
                data: rest
            })
        ]);

        res.json({ ...updatedSettings, organization: updatedOrg });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث الإعدادات' });
    }
});
