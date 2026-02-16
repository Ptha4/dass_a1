import React from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';

const Profile = () => {
    const user = authService.getCurrentUser();
    if (!user) {
        return (
            <div className="profile-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Please <Link to="/login">log in</Link> to view your profile.</p>
            </div>
        );
    }

    return (
        <div className="profile-container" style={{ maxWidth: '500px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px' }}>
            <h1>Profile</h1>
            <p><strong>Email:</strong> {user.email}</p>
            {user.firstName != null && <p><strong>First name:</strong> {user.firstName}</p>}
            {user.lastName != null && <p><strong>Last name:</strong> {user.lastName}</p>}
            {user.participantType != null && <p><strong>Participant type:</strong> {user.participantType}</p>}
            <p><strong>Role:</strong> {user.isAdmin ? 'Admin' : user.isOrganiser ? 'Organiser' : 'Participant'}</p>
            <Link to="/participant-dashboard" style={{ marginRight: '1rem' }}>My tickets</Link>
            {user.isOrganiser && <Link to="/organiser-dashboard">Organiser dashboard</Link>}
        </div>
    );
};

export default Profile;
