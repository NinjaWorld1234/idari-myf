import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // 1. Create Default Organization
    const org = await prisma.organization.upsert({
        where: { id: 'default-org-uuid' }, // Note: in a real seed you'd use a real UUID
        update: {},
        create: {
            id: 'default-org-uuid',
            name: 'ملتقى الشباب المسلم',
            logoUrl: 'https://images.unsplash.com/photo-1576733280144-839556738c82?q=80&w=800&auto=format&fit=crop',
        },
    });

    // 2. Create Default User (Manager)
    const passwordHash = await bcrypt.hash('demo', 10);

    await prisma.user.upsert({
        where: { email: 'admin@myf.ps' },
        update: {},
        create: {
            name: 'أحمد المدير',
            email: 'admin@myf.ps',
            passwordHash: passwordHash,
            role: 'MANAGER',
            organizationId: org.id,
        },
    });

    await prisma.user.upsert({
        where: { email: 'officer@myf.ps' },
        update: {},
        create: {
            name: 'خالد المسؤول',
            email: 'officer@myf.ps',
            passwordHash: passwordHash,
            role: 'OFFICER',
            organizationId: org.id,
        },
    });

    await prisma.user.upsert({
        where: { email: 'accountant@myf.ps' },
        update: {},
        create: {
            name: 'سامي المحاسب',
            email: 'accountant@myf.ps',
            passwordHash: passwordHash,
            role: 'ACCOUNTANT',
            organizationId: org.id,
        },
    });

    // 3. Create Default Settings
    await prisma.orgSettings.upsert({
        where: { organizationId: org.id },
        update: {},
        create: {
            organizationId: org.id,
            registrationNumber: '2024/001',
            address: 'بيت لحم - فلسطين',
            phone: '059-XXXXXXX',
            email: 'contact@myf.ps',
            website: 'www.myf.ps',
            memberIdStart: 1000,
            printHeaderTitle: 'ملتقى الشباب المسلم'
        },
    });

    console.log('✅ Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
