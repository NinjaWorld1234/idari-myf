import { prisma } from '../index.js';

export const VoucherService = {
    async getNextVoucherNumber(organizationId: string, type: string) {
        let sequence = await prisma.voucherSequence.findUnique({
            where: {
                organizationId_type: {
                    organizationId,
                    type,
                },
            },
        });

        if (!sequence) {
            // Create default sequence if not exists
            const prefix = this.getDefaultPrefix(type);
            sequence = await prisma.voucherSequence.create({
                data: {
                    organizationId,
                    type,
                    prefix,
                    nextNumber: 1,
                },
            });
        }

        const voucherNumber = sequence.format
            .replace('{PREFIX}', sequence.prefix)
            .replace('{NUMBER}', sequence.nextNumber.toString().padStart(4, '0'));

        // Increment for next time
        await prisma.voucherSequence.update({
            where: { id: sequence.id },
            data: { nextNumber: { increment: 1 } },
        });

        return voucherNumber;
    },

    getDefaultPrefix(type: string) {
        switch (type) {
            case 'RECEIPT': return 'RC';
            case 'PAYMENT': return 'PY';
            case 'CONVEYANCE': return 'CV';
            case 'TRANSFER': return 'TR';
            default: return 'TX';
        }
    },
};
