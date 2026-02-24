import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Fetching organizations...');
    const orgs = await prisma.organization.findMany();

    if (orgs.length <= 1) {
        console.log('Only 1 or 0 organizations found. Nothing to merge.');
        return;
    }

    console.log(`Found ${orgs.length} organizations. Merging all into the first one: ${orgs[0].id}`);

    const targetOrgId = orgs[0].id;

    // Update all records to point to targetOrgId
    const usersUpdate = await prisma.user.updateMany({
        where: { organizationId: { not: targetOrgId } },
        data: { organizationId: targetOrgId }
    });
    console.log(`Updated ${usersUpdate.count} users.`);

    const membersUpdate = await prisma.member.updateMany({
        where: { organizationId: { not: targetOrgId } },
        data: { organizationId: targetOrgId }
    });
    console.log(`Updated ${membersUpdate.count} members.`);

    const mediaUpdate = await prisma.financialMedium.updateMany({
        where: { organizationId: { not: targetOrgId } },
        data: { organizationId: targetOrgId }
    });
    console.log(`Updated ${mediaUpdate.count} financial media.`);

    const subTypesUpdate = await prisma.subscriptionType.updateMany({
        where: { organizationId: { not: targetOrgId } },
        data: { organizationId: targetOrgId }
    });
    console.log(`Updated ${subTypesUpdate.count} subscription types.`);

    const transUpdate = await prisma.transaction.updateMany({
        where: { organizationId: { not: targetOrgId } },
        data: { organizationId: targetOrgId }
    });
    console.log(`Updated ${transUpdate.count} transactions.`);

    // For OrgSettings, the targetOrgId likely already has one, but other orgs might have modified it.
    // We just delete the other orgs' settings to avoid unique constraint violations.
    const settingsDelete = await prisma.orgSettings.deleteMany({
        where: { organizationId: { not: targetOrgId } }
    });
    console.log(`Deleted ${settingsDelete.count} duplicate settings.`);

    // Now delete the duplicate organizations
    const orgsDelete = await prisma.organization.deleteMany({
        where: { id: { not: targetOrgId } }
    });
    console.log(`Deleted ${orgsDelete.count} duplicate organizations.`);

    console.log('✅ Merge complete.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
