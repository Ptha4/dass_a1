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
            { email: 'admin@example.com' }, // Using a placeholder email for admin
            { 
                username: 'admin', // This field is not in the schema, but was in the prompt. I'll use email for uniqueness.
                password: adminPassword,
                isAdmin: true,
                isOrganiser: false,
                firstName: 'Admin',
                lastName: 'User',
                email: 'admin@example.com', // Using email as the unique identifier
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Admin user added/updated');

        // Organizer 1
        const org1Password = await bcrypt.hash('org1', 10);
        await User.findOneAndUpdate(
            { email: 'a@f.com' },
            {
                username: 'org1', // This field is not in the schema, but was in the prompt. I'll use email for uniqueness.
                category: 'a',
                description: 'a',
                email: 'a@f.com',
                password: org1Password,
                isOrganiser: true,
                firstName: 'Org1',
                lastName: 'User',
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Organizer 1 added/updated');

        // Organizer 2
        const org2Password = await bcrypt.hash('org2', 10);
        await User.findOneAndUpdate(
            { email: 'b@f.com' },
            {
                username: 'org2', // This field is not in the schema, but was in the prompt. I'll use email for uniqueness.
                category: 'b',
                description: 'b',
                email: 'b@f.com',
                password: org2Password,
                isOrganiser: true,
                firstName: 'Org2',
                lastName: 'User',
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        console.log('Organizer 2 added/updated');

        console.log('Users seeded successfully');
        process.exit();
    } catch (error) {
        console.error('Error seeding users:', error);
        process.exit(1);
    }
};

seedUsers();