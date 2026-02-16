import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';
import './OrganiserDashboard.css';

const OrganiserDashboard = () => {
    const [drafts, setDrafts] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [analytics, setAnalytics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [analyticsLoading, setAnalyticsLoading] = useState(true);
    const [publishingId, setPublishingId] = useState(null);
    const [activeTab, setActiveTab] = useState('carousel');
    const navigate = useNavigate();
    const user = authService.getCurrentUser();
    const token = user?.token;

    const fetchDrafts = useCallback(async () => {
        if (!token) return;
        try {
            const data = await eventService.getMyDrafts(token);
            setDrafts(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setDrafts([]);
        }
    }, [token]);

    const fetchAllEvents = useCallback(async () => {
        if (!token) return;
        try {
            const data = await eventService.getEvents({ myDrafts: false }, token);
            setAllEvents(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setAllEvents([]);
        }
    }, [token]);

    const fetchAnalytics = useCallback(async () => {
        if (!token) return;
        setAnalyticsLoading(true);
        try {
            const data = await eventService.getEventAnalytics(token);
            setAnalytics(data);
        } catch (err) {
            console.error(err);
            setAnalytics(null);
        } finally {
            setAnalyticsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchDrafts(), fetchAllEvents(), fetchAnalytics()]);
            setLoading(false);
        };
        loadData();
    }, [token, fetchDrafts, fetchAllEvents, fetchAnalytics]);

    const handlePublish = async (eventId) => {
        if (!token) return;
        setPublishingId(eventId);
        try {
            await eventService.updateEventStatus(eventId, { status: 'published' }, token);
            await Promise.all([fetchDrafts(), fetchAllEvents(), fetchAnalytics()]);
        } catch (err) {
            console.error(err);
        } finally {
            setPublishingId(null);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'draft': return '#6c757d';
            case 'published': return '#28a745';
            case 'ongoing': return '#007bff';
            case 'completed': return '#17a2b8';
            case 'closed': return '#dc3545';
            default: return '#6c757d';
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const EventCard = ({ event }) => (
        <div className="event-card">
            <div className="event-card-header">
                <h4 className="event-title">{event.eventName}</h4>
                <span 
                    className="event-status" 
                    style={{ backgroundColor: getStatusColor(event.status) }}
                >
                    {event.status}
                </span>
            </div>
            <div className="event-card-body">
                <div className="event-info">
                    <span className="event-type">{event.eventType}</span>
                    <span className="event-date">
                        {new Date(event.eventStartDate).toLocaleDateString()}
                    </span>
                </div>
                {event.eventType === 'merch' && (
                    <div className="merch-info">
                        <span>Items: {event.items?.length || 0}</span>
                    </div>
                )}
                {event.registrationLimit && (
                    <div className="registration-info">
                        <span>Limit: {event.registrationLimit}</span>
                    </div>
                )}
            </div>
            <div className="event-card-footer">
                <Link to={`/events/${event._id}`} className="btn btn-view">View</Link>
                <Link to={`/events/${event._id}/edit`} className="btn btn-edit">Edit</Link>
                {event.status === 'draft' && (
                    <button
                        className="btn btn-publish"
                        onClick={() => handlePublish(event._id)}
                        disabled={publishingId === event._id}
                    >
                        {publishingId === event._id ? 'Publishing...' : 'Publish'}
                    </button>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="organiser-dashboard">
                <div className="loading-container">
                    <p>Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="organiser-dashboard">
            <div className="dashboard-header">
                <h2>Organiser Dashboard</h2>
                <p>Welcome back, {user?.firstName || 'Organiser'}!</p>
                <button 
                    className="btn btn-primary create-event-btn"
                    onClick={() => navigate('/create-event')}
                >
                    Create New Event
                </button>
            </div>

            <div className="dashboard-tabs">
                <button
                    className={`tab-btn ${activeTab === 'carousel' ? 'active' : ''}`}
                    onClick={() => setActiveTab('carousel')}
                >
                    Events Carousel
                </button>
                <button
                    className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    Analytics
                </button>
                <button
                    className={`tab-btn ${activeTab === 'drafts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('drafts')}
                >
                    Drafts ({drafts.length})
                </button>
            </div>

            {activeTab === 'carousel' && (
                <div className="dashboard-section">
                    <h3>All Your Events</h3>
                    <p>Manage all your events in one place</p>
                    {allEvents.length === 0 ? (
                        <div className="empty-state">
                            <p>No events yet. Create your first event to get started!</p>
                        </div>
                    ) : (
                        <div className="events-carousel">
                            {allEvents.map((event) => (
                                <EventCard key={event._id} event={event} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'analytics' && (
                <div className="dashboard-section">
                    <h3>Event Analytics</h3>
                    <p>Track your event performance and revenue</p>
                    
                    {analyticsLoading ? (
                        <div className="loading-container">
                            <p>Loading analytics...</p>
                        </div>
                    ) : analytics ? (
                        <div className="analytics-container">
                            <div className="analytics-summary">
                                <div className="summary-cards">
                                    <div className="summary-card">
                                        <h4>Total Events</h4>
                                        <span className="summary-value">{analytics.summary.totalEvents}</span>
                                    </div>
                                    <div className="summary-card">
                                        <h4>Total Registrations</h4>
                                        <span className="summary-value">{analytics.summary.totalRegistrations}</span>
                                    </div>
                                    <div className="summary-card">
                                        <h4>Total Revenue</h4>
                                        <span className="summary-value">{formatCurrency(analytics.summary.totalRevenue)}</span>
                                    </div>
                                </div>
                                
                                <div className="status-breakdown">
                                    <h4>Events by Status</h4>
                                    <div className="status-stats">
                                        <div className="stat-item">
                                            <span className="stat-label">Draft</span>
                                            <span className="stat-value">{analytics.summary.draftEvents}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Published</span>
                                            <span className="stat-value">{analytics.summary.publishedEvents}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Ongoing</span>
                                            <span className="stat-value">{analytics.summary.ongoingEvents}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Completed</span>
                                            <span className="stat-value">{analytics.summary.completedEvents}</span>
                                        </div>
                                        <div className="stat-item">
                                            <span className="stat-label">Closed</span>
                                            <span className="stat-value">{analytics.summary.closedEvents}</span>
                                        </div>
                                    </div>
                                </div>

                                {analytics.summary.merchSales > 0 && (
                                    <div className="revenue-breakdown">
                                        <h4>Revenue Breakdown</h4>
                                        <div className="revenue-stats">
                                            <div className="stat-item">
                                                <span className="stat-label">Event Registrations</span>
                                                <span className="stat-value">{formatCurrency(analytics.summary.totalRevenue - analytics.summary.merchSales)}</span>
                                            </div>
                                            <div className="stat-item">
                                                <span className="stat-label">Merchandise Sales</span>
                                                <span className="stat-value">{formatCurrency(analytics.summary.merchSales)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="recent-events-analytics">
                                <h4>Recent Events Performance</h4>
                                <div className="recent-events-table">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Event Name</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                                <th>Registrations</th>
                                                <th>Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.recentEvents.map((event) => (
                                                <tr key={event._id}>
                                                    <td>{event.eventName}</td>
                                                    <td>{event.eventType}</td>
                                                    <td>
                                                        <span 
                                                            className="status-badge"
                                                            style={{ backgroundColor: getStatusColor(event.status) }}
                                                        >
                                                            {event.status}
                                                        </span>
                                                    </td>
                                                    <td>{event.registrationCount}</td>
                                                    <td>{formatCurrency(
                                                        event.eventType === 'merch' 
                                                            ? 0 // Merch revenue calculated separately
                                                            : (event.registrationCount * (event.registrationFee || 0))
                                                    )}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="error-state">
                            <p>Failed to load analytics data.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'drafts' && (
                <div className="dashboard-section">
                    <h3>Your Drafts</h3>
                    <p>Events are saved as drafts first. Publish them when ready to appear in Browse Events.</p>
                    {drafts.length === 0 ? (
                        <div className="empty-state">
                            <p>No draft events. Create an event to get started.</p>
                        </div>
                    ) : (
                        <div className="drafts-list">
                            {drafts.map((event) => (
                                <EventCard key={event._id} event={event} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default OrganiserDashboard;
