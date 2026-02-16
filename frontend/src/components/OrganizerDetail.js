import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import onboardingService from '../services/onboardingService';
import eventService from '../services/eventService';

const OrganizerDetail = () => {
    const { id } = useParams();
    const [organizer, setOrganizer] = useState(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming'); // 'upcoming' | 'past'

    useEffect(() => {
        const load = async () => {
            if (!id) {
                setError('Invalid organizer.');
                setLoading(false);
                return;
            }
            try {
                const [orgData, eventsData] = await Promise.all([
                    onboardingService.getOrganizerById(id),
                    eventService.getEvents({ organizerId: id }),
                ]);
                setOrganizer(orgData);
                setEvents(Array.isArray(eventsData) ? eventsData : []);
            } catch (err) {
                setError(err.response?.status === 404 ? 'Organizer not found.' : err.response?.data?.message || err.message || 'Failed to load.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [id]);

    const now = new Date();
    const upcoming = events.filter((e) => new Date(e.eventStartDate) >= now);
    const past = events.filter((e) => new Date(e.eventStartDate) < now);

    if (loading) return <div style={{ padding: '2rem' }}>Loading...</div>;
    if (error) {
        return (
            <div style={{ padding: '2rem' }}>
                <p style={{ color: '#c00' }}>{error}</p>
                <Link to="/clubs">Back to All clubs</Link>
            </div>
        );
    }
    if (!organizer) return null;

    const list = activeTab === 'upcoming' ? upcoming : past;

    return (
        <div style={{ maxWidth: '700px', margin: '2rem auto', padding: '0 1rem' }}>
            <Link to="/clubs" style={{ display: 'inline-block', marginBottom: '1rem' }}>← All clubs</Link>
            <div style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                <h1 style={{ marginTop: 0 }}>{organizer.firstName} {organizer.lastName}</h1>
                {organizer.category && <p><strong>Category:</strong> {organizer.category}</p>}
                {organizer.description && <p><strong>Description:</strong> {organizer.description}</p>}
                {organizer.email && (
                    <p><strong>Contact email:</strong>{' '}
                        <a href={`mailto:${organizer.email}`}>{organizer.email}</a>
                    </p>
                )}
            </div>

            <h2>Events</h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <button
                    type="button"
                    onClick={() => setActiveTab('upcoming')}
                    style={{ fontWeight: activeTab === 'upcoming' ? 'bold' : 'normal' }}
                >
                    Upcoming ({upcoming.length})
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab('past')}
                    style={{ fontWeight: activeTab === 'past' ? 'bold' : 'normal' }}
                >
                    Past ({past.length})
                </button>
            </div>
            {list.length === 0 ? (
                <p style={{ color: '#666' }}>No {activeTab} events.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {list.map((event) => (
                        <li key={event._id} style={{ border: '1px solid #eee', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                            <Link to={`/events/${event._id}`} style={{ fontWeight: 500 }}>{event.eventName}</Link>
                            <span style={{ marginLeft: '0.5rem', color: '#666' }}>
                                {new Date(event.eventStartDate).toLocaleDateString()} · {event.status}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default OrganizerDetail;
