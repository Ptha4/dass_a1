const mongoose = require('mongoose');
const Registration = require('../models/Registration');
const PaymentProof = require('../models/PaymentProof');
require('dotenv').config();

// Migration script to move payment proofs from Registration to PaymentProof model
const migratePaymentProofs = async () => {
    try {
        console.log('=== MIGRATING PAYMENT PROOFS TO DATABASE ===');
        
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        // Find all registrations with payment proof stored as file path
        const registrationsWithProofs = await Registration.find({
            'paymentProof.proofImage': { $exists: true, $regex: '^/uploads/' }
        }).populate('event user');

        console.log(`Found ${registrationsWithProofs.length} registrations with local file payment proofs`);

        let migratedCount = 0;
        let skippedCount = 0;

        for (const registration of registrationsWithProofs) {
            try {
                // Check if payment proof already exists in PaymentProof collection
                const existingProof = await PaymentProof.findOne({ 
                    registrationId: registration._id 
                });

                if (existingProof) {
                    console.log(`Skipping registration ${registration._id} - payment proof already migrated`);
                    skippedCount++;
                    continue;
                }

                // Extract file information from the path
                const filePath = registration.paymentProof.proofImage;
                const fileName = filePath.split('/').pop();
                const originalName = fileName; // We don't have original name, use filename

                // Create payment proof record
                const paymentProof = new PaymentProof({
                    registrationId: registration._id,
                    userId: registration.user._id,
                    eventId: registration.event._id,
                    fileName: fileName,
                    originalName: originalName,
                    mimeType: 'image/jpeg', // Default assumption
                    fileSize: 0, // We don't have file size
                    filePath: filePath,
                    publicUrl: filePath,
                    uploadedAt: registration.paymentProof.uploadedAt || new Date(),
                    status: registration.status === 'payment_approved' ? 'approved' : 
                           registration.status === 'payment_rejected' ? 'rejected' : 'pending'
                });

                // Add approval/rejection info if available
                if (registration.paymentProof.approvedAt) {
                    paymentProof.reviewedAt = registration.paymentProof.approvedAt;
                    paymentProof.reviewedBy = registration.paymentProof.approvedBy;
                    paymentProof.status = 'approved';
                    paymentProof.reviewNotes = 'Migrated from local storage';
                }

                if (registration.paymentProof.rejectedAt) {
                    paymentProof.reviewedAt = registration.paymentProof.rejectedAt;
                    paymentProof.rejectionReason = registration.paymentProof.rejectionReason;
                    paymentProof.status = 'rejected';
                    paymentProof.reviewNotes = 'Migrated from local storage';
                }

                await paymentProof.save();

                // Update registration to reference the new payment proof ID
                registration.paymentProof = {
                    proofImage: paymentProof._id,
                    uploadedAt: paymentProof.uploadedAt
                };

                if (registration.paymentProof.approvedAt) {
                    registration.paymentProof.approvedAt = paymentProof.reviewedAt;
                    registration.paymentProof.approvedBy = paymentProof.reviewedBy;
                }

                if (registration.paymentProof.rejectedAt) {
                    registration.paymentProof.rejectedAt = paymentProof.reviewedAt;
                    registration.paymentProof.rejectionReason = paymentProof.rejectionReason;
                }

                await registration.save();

                console.log(`✅ Migrated payment proof for registration ${registration._id}`);
                migratedCount++;

            } catch (error) {
                console.error(`❌ Error migrating registration ${registration._id}:`, error.message);
            }
        }

        console.log('=== MIGRATION SUMMARY ===');
        console.log(`Total registrations with proofs: ${registrationsWithProofs.length}`);
        console.log(`Successfully migrated: ${migratedCount}`);
        console.log(`Skipped (already migrated): ${skippedCount}`);
        console.log('=== END MIGRATION ===');

        await mongoose.disconnect();
        console.log('Disconnected from database');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
};

// Run migration if called directly
if (require.main === module) {
    migratePaymentProofs();
}

module.exports = migratePaymentProofs;
