const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
const auth = require('./middleware/auth');
const { verifyRecaptcha } = require('./middleware/recaptcha');
const eventRoutes = require('./routes/eventRoutes'); // Import event routes
const registrationRoutes = require('./routes/registrationRoutes'); // Import registration routes
const attendanceRoutes = require('./routes/attendanceRoutes'); // Import attendance routes
const passwordResetRoutes = require('./routes/passwordResetRoutes'); // Import password reset routes
const forumRoutes = require('./routes/forumRoutes'); // Import forum routes
const notificationRoutes = require('./routes/notificationRoutes'); // Import notification routes
const SocketManager = require('./socket/socketManager'); // Import Socket Manager
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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
app.use('/api/attendance', attendanceRoutes); // Use attendance routes
app.use('/api/password-reset', passwordResetRoutes); // Use password reset routes
app.use('/api/forum', forumRoutes); // Use forum routes
app.use('/api/notifications', notificationRoutes); // Use notification routes

// Register Route
app.post('/api/auth/register', verifyRecaptcha, async (req, res) => {
    console.log('Register route called');
    console.log('Request body:', req.body);
    
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
            console.log('User already exists validation failed');
            return res.status(400).json({ msg: 'User already exists' });
        }

        // IIIT Email Validation
        if (
            participantType === 'IIIT Participant' &&
            !['@iiit.ac.in','@research.iiit.ac.in','@students.iiit.ac.in'].some(domain => email.endsWith(domain))
        ) {
            console.log('IIIT email validation failed');
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
app.post('/api/auth/login', verifyRecaptcha, async (req, res) => {
    console.log('Login route called');
    console.log('Request body:', req.body);
    
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            console.log('User not found validation failed');
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            console.log('Password mismatch validation failed');
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }
        if (user.disabled) {
            console.log('Account disabled validation failed');
            return res.status(403).json({ msg: 'Account is disabled. Contact admin.' });
        }
        if (user.archived) {
            return res.status(403).json({ msg: 'Account has been archived. Contact admin.' });
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

// Get all organizers (clubs) – public list; exclude disabled/archived
app.get('/api/organizers', async (req, res) => {
    try {
        const organizers = await User.find({
            isOrganiser: true,
            disabled: { $ne: true },
            archived: { $ne: true }
        }).select('_id firstName lastName email category description clubInterest');
        res.json(organizers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Get single organizer by ID (public, for detail page); exclude disabled/archived
app.get('/api/organizers/:id', async (req, res) => {
    try {
        const organizer = await User.findOne({
            _id: req.params.id,
            isOrganiser: true,
            disabled: { $ne: true },
            archived: { $ne: true }
        }).select('_id firstName lastName email category description clubInterest');
        if (!organizer) return res.status(404).json({ message: 'Organizer not found' });
        res.json(organizer);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// ---------- Admin: Club/Organizer Management ----------
const crypto = require('crypto');

function requireAdmin(req, res, next) {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({ msg: 'Admin access required' });
    }
    next();
}

// List all clubs/organizers for admin (includes disabled/archived)
app.get('/api/admin/organizers', auth.protect, requireAdmin, async (req, res) => {
    try {
        const organizers = await User.find({ isOrganiser: true })
            .select('_id firstName lastName email category description clubInterest disabled archived createdAt')
            .sort({ createdAt: -1 });
        res.json(organizers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Create new club/organizer: auto-generate email and password; return credentials for admin to share
app.post('/api/admin/organizers', auth.protect, requireAdmin, async (req, res) => {
    try {
        const { firstName, lastName, category, description, clubInterest } = req.body;
        
        // Generate unique org ID
        let orgId;
        let email;
        let attempts = 0;
        const maxAttempts = 10;
        
        do {
            orgId = Math.random().toString(36).substring(2, 8); // Generate 6-character alphanumeric ID
            email = `org${orgId}@clubs.iiit.ac.in`;
            
            // Check if email already exists
            const existing = await User.findOne({ email });
            
            if (!existing) {
                break; // Email is unique, use it
            }
            
            attempts++;
        } while (attempts < maxAttempts);
        
        if (attempts >= maxAttempts) {
            return res.status(500).json({ msg: 'Failed to generate unique email after multiple attempts. Please try again.' });
        }
        
        const plainPassword = crypto.randomBytes(8).toString('base64').replace(/[+/=]/g, '').slice(0, 12);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);

        const user = await User.create({
            email,
            password: hashedPassword,
            firstName: firstName || 'Club',
            lastName: lastName || '',
            isOrganiser: true,
            category: category || '',
            description: description || '',
            clubInterest: clubInterest || 'others',
            disabled: false,
            archived: false
        });

        const created = await User.findById(user._id).select('-password');
        res.status(201).json({
            organizer: created,
            credentials: {
                email,
                password: plainPassword,
                message: 'Share these credentials with the club/organizer. They can log in immediately and change password from profile.'
            }
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Disable, enable, or archive organizer
app.patch('/api/admin/organizers/:id', auth.protect, requireAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, isOrganiser: true });
        if (!user) return res.status(404).json({ msg: 'Organizer not found' });

        const { disabled, archived } = req.body;
        const wasArchived = user.archived;
        
        if (typeof disabled === 'boolean') user.disabled = disabled;
        if (typeof archived === 'boolean') user.archived = archived;

        await user.save();

        // Handle event visibility based on archive status
        if (archived && !wasArchived) {
            // Archive all events when organizer is archived
            await Event.updateMany(
                { organizerId: req.params.id },
                { status: 'archived' }
            );
        } else if (!archived && wasArchived) {
            // Restore events to draft status when unarchived
            await Event.updateMany(
                { organizerId: req.params.id, status: 'archived' },
                { status: 'draft' }
            );
        }

        const updated = await User.findById(user._id).select('-password');
        res.json(updated);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// Permanently delete organizer
app.delete('/api/admin/organizers/:id', auth.protect, requireAdmin, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.params.id, isOrganiser: true });
        if (!user) return res.status(404).json({ msg: 'Organizer not found' });
        if (user.isAdmin) return res.status(400).json({ msg: 'Cannot delete an admin account.' });

        // Delete all events associated with this organizer
        await Event.deleteMany({ organizerId: req.params.id });
        
        // Delete the organizer
        await User.findByIdAndDelete(req.params.id);
        
        res.json({ msg: 'Organizer and all associated data permanently deleted.' });
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

// Create HTTP server and integrate Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Initialize Socket Manager
const socketManager = new SocketManager(io);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
    console.log(`Socket.IO server initialized`);
});
