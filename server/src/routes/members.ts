import { Router } from 'express';
import { prisma } from '../index.js';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.js';

export const membersRouter = Router();

// Apply authentication to all member routes
membersRouter.use(authenticate);

// List members with filters
membersRouter.get('/', async (req: AuthRequest, res) => {
    try {
        const { status, membershipType, city, search } = req.query;

        const where: any = {
            organizationId: req.user?.organizationId
        };

        if (status) where.status = status;
        if (membershipType) where.membershipType = membershipType;
        if (city) where.city = city;

        if (search) {
            where.OR = [
                { fullName: { contains: String(search), mode: 'insensitive' } },
                { memberCode: { contains: String(search), mode: 'insensitive' } },
                { phone: { contains: String(search), mode: 'insensitive' } },
            ];
        }

        const members = await prisma.member.findMany({
            where,
            orderBy: { memberCode: 'asc' }
        });

        // Parse additionalData from JSON string to object
        const parsed = members.map((m: any) => ({
            ...m,
            additionalData: m.additionalData ? JSON.parse(m.additionalData) : null
        }));

        res.json(parsed);
    } catch (error) {
        console.error('List members error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل قائمة الأعضاء' });
    }
});

// Create member
membersRouter.post('/', async (req: AuthRequest, res) => {
    try {
        const { id, additionalData, ...memberData } = req.body;

        const newMember = await prisma.member.create({
            data: {
                ...memberData,
                additionalData: additionalData ? JSON.stringify(additionalData) : null,
                organizationId: req.user?.organizationId as string,
                joinDate: memberData.joinDate ? new Date(memberData.joinDate) : new Date()
            }
        });

        res.status(201).json({
            ...newMember,
            additionalData: newMember.additionalData ? JSON.parse(newMember.additionalData) : null
        });
    } catch (error) {
        console.error('Create member error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إضافة العضو' });
    }
});

// Update member
membersRouter.put('/:id', async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const { additionalData, ...memberData } = req.body;

        const updatedMember = await prisma.member.update({
            where: {
                id,
                organizationId: req.user?.organizationId
            },
            data: {
                ...memberData,
                additionalData: additionalData !== undefined ? JSON.stringify(additionalData) : undefined,
                joinDate: memberData.joinDate ? new Date(memberData.joinDate) : undefined
            }
        });

        res.json({
            ...updatedMember,
            additionalData: updatedMember.additionalData ? JSON.parse(updatedMember.additionalData) : null
        });
    } catch (error) {
        console.error('Update member error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحديث بيانات العضو' });
    }
});

// Delete member (Manager only)
membersRouter.delete('/:id', authorize(['MANAGER']), async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        await prisma.member.delete({
            where: {
                id,
                organizationId: req.user?.organizationId
            }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Delete member error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف العضو' });
    }
});

// Delete all members (Manager only)
membersRouter.delete('/', authorize(['MANAGER']), async (req: AuthRequest, res) => {
    try {
        await prisma.member.deleteMany({
            where: {
                organizationId: req.user?.organizationId
            }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Delete all members error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء مسح جميع الأعضاء' });
    }
});
