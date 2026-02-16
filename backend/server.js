const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('./middleware/auth');
const eventRoutes = require('./routes/eventRoutes'); // Import event routes
const registrationRoutes = require('./routes/registrationRoutes'); // Import registration routes

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('MongoDB connected'))
.catch(err => console.error(err));

const User = require('./models/User');
const Event = require('./models/Event'); // Import Event model

// Use event routes
app.use('/api/events', eventRoutes);
app.use('/api/register', registrationRoutes); // Use registration routes

// Register Route
app.post('/api/auth/register', async (req, res) => {
    const { 
        firstName, 
        lastName, 
        email, 
        participantType, 
        collegeOrOrgName, 
        contactNumber, 
        password, 
        isAdmin, 
        isOrganiser,
        category,
        description
    } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // IIIT Email Validation
        if (participantType === 'IIIT Participant' && !email.endsWith('@iiit.ac.in')) {
            return res.status(400).json({ msg: 'IIIT Participants must use an IIIT-issued email ID' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = new User({
            firstName,
            lastName,
            email,
            participantType,
            collegeOrOrgName,
            contactNumber,
            password: hashedPassword,
            isAdmin: isAdmin || false,
            isOrganiser: isOrganiser || false,
            category: category || '',
            description: description || ''
        });

        await user.save();

        const payload = {
            user: {
                id: user.id,
                isAdmin: user.isAdmin,
                isOrganiser: user.isOrganiser,
                participantType: user.participantType, // Include participantType
                onboardingComplete: user.onboardingComplete // Include onboardingComplete
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    isAdmin: user.isAdmin,
                    isOrganiser: user.isOrganiser,
                    participantType: user.participantType, // Return participantType
                    onboardingComplete: user.onboardingComplete // Return onboardingComplete
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Login Route
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                isAdmin: user.isAdmin,
                isOrganiser: user.isOrganiser,
                participantType: user.participantType, // Include participantType
                onboardingComplete: user.onboardingComplete // Include onboardingComplete
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '1h' },
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    isAdmin: user.isAdmin,
                    isOrganiser: user.isOrganiser,
                    participantType: user.participantType, // Return participantType
                    onboardingComplete: user.onboardingComplete // Return onboardingComplete
                });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// Protected route example
app.get('/api/protected', auth.protect, (req, res) => {
    res.json({ msg: `Welcome ${req.user.isAdmin ? 'Admin' : req.user.isOrganiser ? 'Organizer' : 'Participant'}! This is a protected route.` });
});

// Get user details (protected)
app.get('/api/auth/user', auth.protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Update profile (protected) - editable fields for participants
app.put('/api/auth/profile', auth.protect, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const { firstName, lastName, contactNumber, collegeOrOrgName, selectedInterests, followedClubs } = req.body;

        if (firstName !== undefined) user.firstName = firstName;
        if (lastName !== undefined) user.lastName = lastName;
        if (contactNumber !== undefined) user.contactNumber = contactNumber;
        if (collegeOrOrgName !== undefined) user.collegeOrOrgName = collegeOrOrgName;
        if (Array.isArray(selectedInterests)) {
            user.selectedInterests = selectedInterests.filter(i => ['cultural', 'technical', 'sports', 'others'].includes(i));
        }
        if (Array.isArray(followedClubs)) {
            user.followedClubs = followedClubs;
            user.organizerPreferences = followedClubs;
        }

        await user.save();
        const updated = await User.findById(user._id).select('-password');
        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Change password (protected)
app.post('/api/auth/change-password', auth.protect, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ msg: 'Current password and new password are required.' });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ msg: 'New password must be at least 6 characters.' });
        }

        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Current password is incorrect.' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        res.json({ msg: 'Password changed successfully.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get all organizers (clubs)
app.get('/api/organizers', async (req, res) => {
    try {
        const organizers = await User.find({ isOrganiser: true }).select('_id firstName lastName email category description clubInterest');
        res.json(organizers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get single organizer by ID (public, for detail page)
app.get('/api/organizers/:id', async (req, res) => {
    try {
        const organizer = await User.findOne({ _id: req.params.id, isOrganiser: true })
            .select('_id firstName lastName email category description clubInterest');
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
        res.json(organizer);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Save participant onboarding preferences (selected interests + followed clubs)
app.post('/api/participants/onboarding', auth.protect, async (req, res) => {
    const { organizerIds, followedClubs, selectedInterests } = req.body;

    try {
        let user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.isOrganiser || user.isAdmin) {
            return res.status(403).json({ msg: 'Only participants can complete onboarding' });
        }

        const clubIds = Array.isArray(followedClubs) ? followedClubs : (Array.isArray(organizerIds) ? organizerIds : []);
        const interests = Array.isArray(selectedInterests) ? selectedInterests : [];

        user.followedClubs = clubIds;
        user.organizerPreferences = clubIds; // keep in sync for backward compat
        user.selectedInterests = interests.filter(i => ['cultural', 'technical', 'sports', 'others'].includes(i));
        user.onboardingComplete = true;

        await user.save();

        res.json({ msg: 'Onboarding preferences saved successfully', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Error handling middleware: use err.status if set (e.g. 400, 403, 404 from controllers)
app.use((err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || 'Server Error' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
