const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    firstName: { type: String },
    lastName: { type: String },
    email: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                if (this.participantType === 'iiit participant') {
                    return v.endsWith('@research.iiit.ac.in') || v.endsWith('@student.iiit.ac.in');
                }
                return true;
            },
            message: props => `${props.value} is not a valid IIIT email domain for an IIIT participant!`
        }
    },
    participantType: { type: String },
    collegeOrOrgName: { type: String },
    contactNumber: { type: String },
    password: { type: String, required: true },
    isAdmin: { type: Boolean, default: false },
    isOrganiser: { type: Boolean, default: false },
    category: { type: String }, // For organizers
    description: { type: String }, // For organizers
    clubInterest: { type: String, enum: ['cultural', 'technical', 'sports', 'others'] }, // For organizers/clubs
    discordWebhookUrl: { 
        type: String, 
        validate: {
            validator: function(v) {
                if (!v) return true; // Optional field
                // Basic URL validation for Discord webhooks
                const discordWebhookRegex = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[a-zA-Z0-9_-]+$/;
                return discordWebhookRegex.test(v);
            },
            message: props => `${props.value} is not a valid Discord webhook URL! Format: https://discord.com/api/webhooks/WEBHOOK_ID/WEBHOOK_TOKEN`
        }
    },
    organizerPreferences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Legacy: preferred organizers
    selectedInterests: [{ type: String, enum: ['cultural', 'technical', 'sports', 'others'] }], // For participants (onboarding)
    followedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // For participants (onboarding)
    onboardingComplete: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },   // if true, cannot log in
    archived: { type: Boolean, default: false },   // if true, cannot log in; soft-delete
});

module.exports = mongoose.model('User', UserSchema);