import React from 'react';
import { useNavigate } from 'react-router-dom';

const OrganiserDashboard = () => {
    const navigate = useNavigate();

    const handleCreateEventClick = () => {
        navigate('/create-event');
    };

    return (
        <div>
            <h2>Organizer Dashboard</h2>
            <p>Welcome, Organizer!</p>
            <button onClick={handleCreateEventClick}>Create Event</button>
            {/* Organizer specific content */}
        </div>
    );
};

export default OrganiserDashboard;