import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';

const EVENT_TYPES = [
    { value: '', label: 'All events' }, // Updated label
    { value: 'normal', label: 'Normal' },
    { value: 'merch', label: 'Merch' },
    { value: 'ticket', label: 'Ticket' },
    { value: 'rsvp', label: 'RSVP' },
];

const ELIGIBILITY_OPTIONS = [
    { value: '', label: 'All' },
    { value: 'IIIT Participant', label: 'IIIT Participant' },
    { value: 'IIIT and Non-IIIT Participant', label: 'IIIT and Non-IIIT Participant' },
];

const EventDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState('');
    const [eventType, setEventType] = useState('');
    const [eligibility, setEligibility] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [followedOnly, setFollowedOnly] = useState(false); // false = All events, true = Followed clubs only
    const [showTrending, setShowTrending] = useState(false); // Toggle for trending view
    const navigate = useNavigate();

    const user = authService.getCurrentUser();
    const canUseFollowedFilter = user && !user.isOrganiser; // participants have followedClubs

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = {
                ...(search.trim() && { search: search.trim() }),
                ...(eventType && { eventType }),
                ...(eligibility && { eligibility }),
                ...(fromDate && { fromDate }),
                ...(toDate && { toDate }),
                ...(followedOnly && { followedOnly: true }),
                ...(showTrending && { trending: '24h' }), // Add trending parameter
            };
            const token = user?.token || null;
            const data = await eventService.getEvents(params, token);
            setEvents(data);
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to fetch events.');
            setEvents([]);
        } finally {
            setLoading(false);
        }
    }, [search, eventType, eligibility, fromDate, toDate, followedOnly, showTrending, user?.token]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    const handleClearFilters = () => {
        setSearch('');
        setEventType('');
        setEligibility('');
        setFromDate('');
        setToDate('');
        setFollowedOnly(false);
        setShowTrending(false); // Clear trending state
    };

    return (
        <div className="event-dashboard-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
            <h1>Browse Events</h1>
            {user && user.isOrganiser && (
                <button onClick={() => navigate('/create-event')} className="create-event-button" style={{ marginBottom: '1rem' }}>
                    Create New Event
                </button>
            )}

            {/* Search */}
            <div style={{ marginBottom: '1rem' }}>
                <label htmlFor="event-search" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
                    Search (event or organizer name)
                </label>
                <input
                    id="event-search"
                    type="text"
                    placeholder="Type to search..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ width: '100%', maxWidth: '400px', padding: '0.5rem' }}
                />
            </div>

            {/* Filters row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
                <div>
                    <label htmlFor="filter-type" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Event type</label>
                    <select
                        id="filter-type"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        style={{ padding: '0.5rem', minWidth: '140px' }}
                    >
                        {EVENT_TYPES.map((opt) => (
                            <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="filter-eligibility" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>Eligibility</label>
                    <select
                        id="filter-eligibility"
                        value={eligibility}
                        onChange={(e) => setEligibility(e.target.value)}
                        style={{ padding: '0.5rem', minWidth: '200px' }}
                    >
                        {ELIGIBILITY_OPTIONS.map((opt) => (
                            <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="filter-from" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>From date</label>
                    <input
                        id="filter-from"
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        style={{ padding: '0.5rem' }}
                    />
                </div>
                <div>
                    <label htmlFor="filter-to" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>To date</label>
                    <input
                        id="filter-to"
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        style={{ padding: '0.5rem' }}
                    />
                </div>
                {canUseFollowedFilter && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ fontWeight: 500 }}>Show:</label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="scope"
                                checked={!followedOnly}
                                onChange={() => setFollowedOnly(false)}
                            />
                            All events
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                            <input
                                type="radio"
                                name="scope"
                                checked={followedOnly}
                                onChange={() => setFollowedOnly(true)}
                            />
                            Followed clubs
                        </label>
                    </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <label style={{ fontWeight: 500 }}>View:</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="trending"
                            checked={!showTrending}
                            onChange={() => setShowTrending(false)}
                        />
                        All events
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
                        <input
                            type="radio"
                            name="trending"
                            checked={showTrending}
                            onChange={() => setShowTrending(true)}
                        />
                        Trending (Top 5/24h)
                    </label>
                </div>
                <button type="button" onClick={handleClearFilters} style={{ padding: '0.5rem 0.75rem', background: '#eee' }}>
                    Clear filters
                </button>
            </div>

            {loading && <div>Loading events...</div>}
            {error && <div style={{ color: '#c00', marginBottom: '1rem' }}>{error}</div>}

            {!loading && !error && (
                <div className="events-list">
                    {user && !user.isOrganiser && !user.isAdmin && (
                        <div className="preference-info" style={{ 
                            backgroundColor: '#e3f2fd', 
                            border: '1px solid #2196f3', 
                            borderRadius: '8px', 
                            padding: '1rem', 
                            marginBottom: '1rem',
                            fontSize: '0.9rem'
                        }}>
                            <h4 style={{ margin: '0 0 0.5rem 0', color: '#1976d2' }}> Personalized Event Ordering</h4>
                            
                        </div>
                    )}
                    
                    {events.length === 0 ? (
                        <p>No events match your search or filters.</p>
                    ) : (
                        events.map((event) => (
                            <div key={event._id} className="event-card" style={{ 
                                border: '1px solid #eee', 
                                borderRadius: '8px', 
                                padding: '1rem', 
                                marginBottom: '1rem',
                                position: 'relative'
                            }}>
                                {/* Preference Score Indicator */}
                                {user && !user.isOrganiser && !user.isAdmin && event._preferenceScore > 0 && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '0.5rem',
                                        right: '0.5rem',
                                        backgroundColor: '#4caf50',
                                        color: 'white',
                                        padding: '0.25rem 0.5rem',
                                        borderRadius: '12px',
                                        fontSize: '0.75rem',
                                        fontWeight: 'bold'
                                    }}>
                                        {event._preferenceScore >= 100 ? ' Top Match' : 
                                         event._preferenceScore >= 50 ? ' Good Match' : 
                                         event._preferenceScore >= 25 ? ' Coming Soon' : ' Recommended'}
                                    </div>
                                )}
                                
                                <h2 style={{ marginTop: 0, paddingRight: event._preferenceScore > 0 ? '100px' : '0' }}>
                                    {event.eventName}
                                </h2>
                                <p>{event.eventDescription}</p>
                                <p>Type: {event.eventType} · Status: {event.status}</p>
                                <p>Organizer: {event.organizerId ? (event.organizerId.firstName && event.organizerId.lastName ? `${event.organizerId.firstName} ${event.organizerId.lastName}` : event.organizerId.email) : 'N/A'}</p>
                                <p>Starts: {event.eventStartDate ? new Date(event.eventStartDate).toLocaleDateString() : 'N/A'} · Ends: {event.eventEndDate ? new Date(event.eventEndDate).toLocaleDateString() : 'N/A'}</p>
                                <p>Registration deadline: {event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleDateString() : 'N/A'}</p>
                                <Link to={`/events/${event._id}`}>View Details</Link>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default EventDashboard;
