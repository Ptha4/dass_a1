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
    organizerPreferences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Legacy: preferred organizers
    selectedInterests: [{ type: String, enum: ['cultural', 'technical', 'sports', 'others'] }], // For participants (onboarding)
    followedClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // For participants (onboarding)
    onboardingComplete: { type: Boolean, default: false },
});

module.exports = mongoose.model('User', UserSchema);