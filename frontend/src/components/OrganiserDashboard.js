import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';

const OrganiserDashboard = () => {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [publishingId, setPublishingId] = useState(null);
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const token = user?.token;

    const fetchDrafts = async () => {
        if (!token) {
            setLoading(false);
            return;
        }
        try {
            const data = await eventService.getMyDrafts(token);
            setDrafts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setDrafts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrafts();
    }, [token]);

    const handlePublish = async (eventId) => {
        if (!token) return;
        setPublishingId(eventId);
        try {
            await eventService.updateEventStatus(eventId, { status: 'published' }, token);
            setDrafts((prev) => prev.filter((e) => e._id !== eventId));
        } catch (err) {
            console.error(err);
        } finally {
            setPublishingId(null);
        }
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '1rem' }}>
            <h2>Organiser Dashboard</h2>
            <p>Welcome, Organiser!</p>
            <button onClick={() => navigate('/create-event')} style={{ marginBottom: '1.5rem' }}>
                Create Event
            </button>

            <h3>Your drafts</h3>
            <p style={{ color: '#555', marginBottom: '1rem' }}>
                Events are saved as drafts first. Publish them when ready to appear in Browse Events.
            </p>
            {loading ? (
                <p>Loading drafts...</p>
            ) : drafts.length === 0 ? (
                <p>No draft events. Create an event to get started.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {drafts.map((event) => (
                        <li
                            key={event._id}
                            style={{
                                border: '1px solid #eee',
                                borderRadius: '8px',
                                padding: '1rem',
                                marginBottom: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap',
                                gap: '0.5rem',
                            }}
                        >
                            <div>
                                <strong>{event.eventName}</strong>
                                <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                                    {event.eventType} · {new Date(event.eventStartDate).toLocaleDateString()}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <Link to={`/events/${event._id}`}>View</Link>
                                <Link to={`/events/${event._id}/edit`}>Edit</Link>
                                <button
                                    type="button"
                                    onClick={() => handlePublish(event._id)}
                                    disabled={publishingId === event._id}
                                >
                                    {publishingId === event._id ? 'Publishing...' : 'Publish'}
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <p style={{ marginTop: '1.5rem' }}>
                <Link to="/events">Browse all events</Link>
            </p>
        </div>
    );
};

export default OrganiserDashboard;
