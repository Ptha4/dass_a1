const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const User = require('./models/User'); // Assuming User model is in ./models/User.js

dotenv.config();

const seedUsers = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected for seeding');

        // Admin User
        const adminPassword = await bcrypt.hash('admin', 10);
        await User.findOneAndUpdate(
            { email: 'admin@iiit.ac.in' }, // Using a placeholder email for admin
            { 
                username: 'admin',
                password: adminPassword,
                isAdmin: true,
                isOrganiser: false,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@iiit.ac.in', // Using email as the unique identifier
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Admin user added/updated');

        // Organizer 1
        const org1Password = await bcrypt.hash('org', 10);
        await User.findOneAndUpdate(
            { email: 'org1@clubs.iiit.ac.in' },
            {
                username: 'org1',
                category: 'a',
                description: 'a',
                email: 'org1@clubs.iiit.ac.in',
                password: org1Password,
                isOrganiser: true,
                firstName: 'Org1',
                lastName: 'User',
                clubInterest: 'technical',
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Organizer 1 added/updated');

        // Organizer 2
        const org2Password = await bcrypt.hash('org', 10);
        await User.findOneAndUpdate(
            { email: 'org2@clubs.iiit.ac.in' },
            {
                username: 'org2',
                category: 'b',
                description: 'b',
                email: 'org2@clubs.iiit.ac.in',
                password: org2Password,
                isOrganiser: true,
                firstName: 'Org2',
                lastName: 'User',
                clubInterest: 'cultural',
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Organizer 2 added/updated');

        const participantPassword = await bcrypt.hash('user', 10);
        await User.findOneAndUpdate(
            { email: 'user@research.iiit.ac.in' },
            {
                firstName: 'user',
                lastName: 'user',
                email: 'user@research.iiit.ac.in',
                password: participantPassword,
                participantType: 'IIIT Participant',
                collegeOrOrgName: 'IIIT Hyderabad',
                contactNumber: '9999999999',
                isAdmin: false,
                isOrganiser: false,
                onboardingComplete: false
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Participant user added/updated');

        const nonparticipantPassword = await bcrypt.hash('user', 10);
        await User.findOneAndUpdate(
            { email: 'user@test.ac.in' },
            {
                firstName: 'user',
                lastName: 'user',
                email: 'user@test.ac.in',
                password: participantPassword,
                participantType: 'Non-IIIT Participant',
                collegeOrOrgName: 'IIT Hyderabad',
                contactNumber: '9999999999',
                isAdmin: false,
                isOrganiser: false,
                onboardingComplete: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Participant user added/updated');

        console.log('Users seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();