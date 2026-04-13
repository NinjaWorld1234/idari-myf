import { PrismaClient } from '@prisma/client';
import { subscriptionService } from './services/subscriptionService.js';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Updating members join dates based on the new April 2026 rule...');
    
    // 1. Force recalculation of join dates for all members
    const membersToUpdate = await prisma.member.findMany();
    let updatedCount = 0;
    const jan2026 = new Date('2026-01-01T00:00:00Z');

    for (const m of membersToUpdate) {
        // Force their joinDate to Jan 1 2026 to ensure 4 months of debts (Jan, Feb, Mar, Apr)
        await prisma.member.update({
            where: { id: m.id },
            data: { joinDate: jan2026 }
        });
        updatedCount++;
    }
    console.log(`✅ Updated joinDate to Jan 2026 for ${updatedCount} members.`);

    // 2. Now generate dues for all members across the organization
    const defaultOrg = await prisma.organization.findFirst();
    if (defaultOrg) {
        console.log('Generating missing Subscription Dues (Invoices)...');
        const count = await subscriptionService.generateAllDues(defaultOrg.id);
        console.log(`✅ Generated missing dues for ${count} active members.`);
    }

    // 3. Recalculate any existing transactions mapped to oldest pending dues
    const subTxs = await prisma.transaction.findMany({
        where: { category: 'اشتراكات الأعضاء', status: 'ACTIVE', subscriptionDueId: null, memberId: { not: null } },
        orderBy: { date: 'asc' }
    });

    console.log(`Found ${subTxs.length} historical subscription transactions without linked dues.`);
    for (const tx of subTxs) {
        if (!tx.memberId) continue;
        
        // Find oldest pending due for this member
        const pendingDues = await prisma.subscriptionDue.findMany({
            where: { memberId: tx.memberId, status: 'PENDING' },
            orderBy: { dueDate: 'asc' }
        });

        let remainingAmount = Number(tx.amount);
        let dueIndex = 0;

        while (remainingAmount > 0 && dueIndex < pendingDues.length) {
            const currentDue = pendingDues[dueIndex];
            const currentDueAmt = Number(currentDue.amount);

            if (remainingAmount >= currentDueAmt) {
                // Fully pay this due
                await prisma.subscriptionDue.update({
                    where: { id: currentDue.id },
                    data: { status: 'PAID' }
                });
                
                await prisma.transaction.update({
                    where: { id: tx.id },
                    data: { subscriptionDueId: currentDue.id }
                });

                remainingAmount -= currentDueAmt;
            } else {
                break; // Not enough to fully pay the next due
            }
            dueIndex++;
        }
    }

    console.log('✅ Allocation of historical transactions to dues completed.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
