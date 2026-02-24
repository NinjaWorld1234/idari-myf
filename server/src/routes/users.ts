import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index.js';
import { authenticate, AuthRequest, authorize } from '../middleware/auth.js';

export const usersRouter = Router();

usersRouter.use(authenticate);

// Get all users in the organization (Manager only)
usersRouter.get('/', authorize(['MANAGER']), async (req: AuthRequest, res) => {
    try {
        const users = await prisma.user.findMany({
            where: { organizationId: req.user?.organizationId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatar: true,
                createdAt: true
            }
        });

        res.json(users);
    } catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء تحميل قائمة المستخدمين' });
    }
});

// Create new user (Manager only)
usersRouter.post('/', authorize(['MANAGER']), async (req: AuthRequest, res) => {
    try {
        const { name, email, password, role, avatar } = req.body;

        if (!name || !email || !password || !role) {
            return res.status(400).json({ error: 'يرجى إدخال جميع البيانات المطلوبة' });
        }

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ error: 'البريد الإلكتروني مستخدم بالفعل' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role,
                avatar,
                organizationId: req.user?.organizationId as string
            }
        });

        const { passwordHash: _, ...safeUser } = newUser;
        res.status(201).json(safeUser);
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء إضافة المستخدم' });
    }
});

// Delete user (Manager only)
usersRouter.delete('/:id', authorize(['MANAGER']), async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;

        // Preventive check: Don't let users delete themselves
        if (id === req.user?.id) {
            return res.status(400).json({ error: 'لا يمكن حذف حسابك الخاص' });
        }

        await prisma.user.delete({
            where: {
                id,
                organizationId: req.user?.organizationId
            }
        });

        res.status(204).send();
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: 'حدث خطأ أثناء حذف المستخدم' });
    }
});
