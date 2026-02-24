import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { prisma } from '../index.js';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        organizationId: string;
        role: string;
    };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'غير مصرح لك بالدخول، يرجى تسجيل الدخول' });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwtSecret) as any;

        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'توكن غير صالح' });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, organizationId: true, role: true }
        });

        if (!user) {
            return res.status(401).json({ error: 'المستخدم غير موجود' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'جلسة عمل منتهية، يرجى تسجيل الدخول مرة أخرى' });
    }
};

export const authorize = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'ليس لديك صلاحية للقيام بهذا الإجراء' });
        }
        next();
    };
};
