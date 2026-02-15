import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';

const EventDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Mock user data for demonstration. In a real app, this would come from auth context/redux.
    const user = JSON.parse(localStorage.getItem('user')); // Assuming user data is stored in localStorage

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await eventService.getEvents();
                setEvents(data);
            } catch (err) {
                setError('Failed to fetch events.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvents();
    }, []);

    if (loading) {
        return <div>Loading events...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    return (
        <div className="event-dashboard-container">
            <h1>Event Dashboard</h1>
            {user && user.isOrganiser && (
                <button onClick={() => navigate('/create-event')} className="create-event-button">
                    Create New Event
                </button>
            )}

            <div className="events-list">
                {events.length === 0 ? (
                    <p>No events available.</p>
                ) : (
                    events.map((event) => (
                        <div key={event._id} className="event-card">
                            <h2>{event.eventName}</h2>
                            <p>{event.eventDescription}</p>
                            <p>Type: {event.eventType}</p>
                            <p>Status: {event.status}</p>
                            <p>Organizer: {event.organizerId ? event.organizerId.username : 'N/A'}</p>
                            <p>Starts: {new Date(event.eventStartDate).toLocaleDateString()}</p>
                            <p>Ends: {new Date(event.eventEndDate).toLocaleDateString()}</p>
                            <p>Registration Deadline: {new Date(event.registrationDeadline).toLocaleDateString()}</p>
                            {/* Add more event details as needed */}
                            <Link to={`/events/${event._id}`}>View Details</Link>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default EventDashboard;