import React, { useEffect, useState } from 'react';
import eventService from '../services/eventService';
import authService from '../services/authService';
import { Link } from 'react-router-dom';

const ParticipantDashboard = () => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showQrCode, setShowQrCode] = useState(null);
    const [activeTab, setActiveTab] = useState('upcoming'); // Tab state for categorization

    useEffect(() => {
        const fetchMyTickets = async () => {
            const user = authService.getCurrentUser();
            const token = user?.token;

            if (!token) {
                setError('You must be logged in to view your events.');
                setLoading(false);
                return;
            }

            try {
                const data = await eventService.getMyTickets(token);
                setRegistrations(data);
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch your events.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyTickets();
    }, []);

    // Categorize registrations based on status and event dates
    const categorizeRegistrations = () => {
        const now = new Date();
        
        return {
            upcoming: registrations.filter(reg => 
                reg.event?.eventStartDate && 
                new Date(reg.event.eventStartDate) > now &&
                ['confirmed', 'payment_approved'].includes(reg.status)
            ),
            normal: registrations.filter(reg => 
                reg.event?.eventType === 'normal' &&
                (new Date(reg.event?.eventStartDate) <= now || !['confirmed', 'payment_approved'].includes(reg.status))
            ),
            merchandise: registrations.filter(reg => 
                reg.event?.eventType === 'merch' &&
                (new Date(reg.event?.eventStartDate) <= now || !['confirmed', 'payment_approved'].includes(reg.status))
            ),
            completed: registrations.filter(reg => 
                reg.status === 'confirmed' &&
                reg.event?.eventStartDate &&
                new Date(reg.event.eventStartDate) <= now
            ),
            cancelled: registrations.filter(reg => 
                ['cancelled', 'payment_rejected'].includes(reg.status)
            )
        };
    };

    const categorized = categorizeRegistrations();

    const renderEventCard = (reg) => (
        <div key={reg._id} className="registration-card" style={{
            border: '1px solid #ddd',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#fff'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', color: '#333' }}>
                        {reg.event?.eventName || 'Event'}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', fontSize: '0.9rem' }}>
                        <p><strong>Type:</strong> {reg.event?.eventType || '—'}</p>
                        <p><strong>Organizer:</strong> {
                            reg.event?.organizerId?.firstName && reg.event?.organizerId?.lastName 
                                ? `${reg.event.organizerId.firstName} ${reg.event.organizerId.lastName}`
                                : reg.event?.organizerId?.email || '—'
                        }</p>
                        <p><strong>Date:</strong> {
                            reg.event?.eventStartDate 
                                ? new Date(reg.event.eventStartDate).toLocaleDateString() 
                                : '—'
                        }</p>
                        <p><strong>Time:</strong> {
                            reg.event?.eventStartDate 
                                ? new Date(reg.event.eventStartDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '—'
                        }</p>
                        <p><strong>Location:</strong> {reg.event?.location || '—'}</p>
                        <p><strong>Status:</strong> 
                            <span style={{
                                padding: '0.25rem 0.5rem',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold',
                                backgroundColor: 
                                    reg.status === 'confirmed' ? '#d4edda' :
                                    reg.status === 'payment_pending' ? '#fff3cd' :
                                    reg.status === 'payment_approved' ? '#d1ecf1' :
                                    reg.status === 'cancelled' || reg.status === 'payment_rejected' ? '#f8d7da' : '#e2e3e5',
                                color: 
                                    reg.status === 'confirmed' ? '#155724' :
                                    reg.status === 'payment_pending' ? '#856404' :
                                    reg.status === 'payment_approved' ? '#0c5460' :
                                    reg.status === 'cancelled' || reg.status === 'payment_rejected' ? '#721c24' : '#383d41'
                            }}>
                                {reg.status.replace('_', ' ').toUpperCase()}
                            </span>
                        </p>
                        <p><strong>Registration Date:</strong> {new Date(reg.registrationDate).toLocaleDateString()}</p>
                    </div>
                </div>
                <div style={{ marginLeft: '1rem', textAlign: 'right' }}>
                    {reg.ticket?.ticketId && (
                        <div style={{ marginBottom: '0.5rem' }}>
                            <Link 
                                to={`/ticket/${reg.ticket.ticketId}`}
                                style={{
                                    display: 'inline-block',
                                    padding: '0.5rem 1rem',
                                    backgroundColor: '#007bff',
                                    color: 'white',
                                    textDecoration: 'none',
                                    borderRadius: '4px',
                                    fontSize: '0.8rem'
                                }}
                            >
                                View Ticket
                            </Link>
                        </div>
                    )}
                    {reg.ticket?.qrCodeData && (
                        <button
                            onClick={() => setShowQrCode(reg.ticket.qrCodeData)}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                            }}
                        >
                            QR Code
                        </button>
                    )}
                </div>
            </div>

            {/* Purchased Items for Merch Events */}
            {reg.purchasedItems && reg.purchasedItems.length > 0 && (
                <div style={{ 
                    marginTop: '1rem', 
                    padding: '0.75rem', 
                    backgroundColor: '#f8f9fa', 
                    borderRadius: '4px',
                    border: '1px solid #e9ecef'
                }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Purchased Items:</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {reg.purchasedItems.map((item, index) => (
                            <span key={index} style={{
                                padding: '0.25rem 0.5rem',
                                backgroundColor: '#e9ecef',
                                borderRadius: '4px',
                                fontSize: '0.8rem'
                            }}>
                                {item.item.itemName} (x{item.quantity}) - ₹{item.quantity * item.price}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Team Name if applicable */}
            {reg.teamName && (
                <div style={{ marginTop: '0.5rem' }}>
                    <p><strong>Team Name:</strong> {reg.teamName}</p>
                </div>
            )}
        </div>
    );

    if (loading) {
        return <div className="participant-dashboard-container" style={{ padding: '2rem', textAlign: 'center' }}>
            <div>Loading your events...</div>
        </div>;
    }

    if (error) {
        return (
            <div className="participant-dashboard-container" style={{ padding: '2rem' }}>
                <div style={{ backgroundColor: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '4px', padding: '1rem', marginBottom: '1rem' }}>
                    <p style={{ margin: 0, color: '#721c24' }}>{error}</p>
                </div>
                <Link to="/login" style={{ color: '#007bff', textDecoration: 'none' }}>Login</Link>
            </div>
        );
    }

    return (
        <div className="participant-dashboard-container" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ marginBottom: '2rem', color: '#333' }}>My Events Dashboard</h1>

            {/* Upcoming Events Section */}
            <section style={{ marginBottom: '3rem' }}>
                <h2 style={{ 
                    borderBottom: '2px solid #007bff', 
                    paddingBottom: '0.5rem', 
                    marginBottom: '1rem',
                    color: '#007bff'
                }}>
                     Upcoming Events
                </h2>
                {categorized.upcoming.length === 0 ? (
                    <div style={{ 
                        backgroundColor: '#f8f9fa', 
                        border: '1px solid #e9ecef', 
                        borderRadius: '4px', 
                        padding: '2rem', 
                        textAlign: 'center' 
                    }}>
                        <p style={{ margin: 0, color: '#6c757d' }}>You have no upcoming events.</p>
                    </div>
                ) : (
                    <div className="upcoming-events">
                        {categorized.upcoming.map(renderEventCard)}
                    </div>
                )}
            </section>

            {/* Participation History Section */}
            <section>
                <h2 style={{ 
                    borderBottom: '2px solid #28a745', 
                    paddingBottom: '0.5rem', 
                    marginBottom: '1rem',
                    color: '#28a745'
                }}>
                    📋 Participation History
                </h2>

                {/* Tab Navigation */}
                <div style={{ 
                    display: 'flex', 
                    borderBottom: '1px solid #dee2e6', 
                    marginBottom: '1rem' 
                }}>
                    {['normal', 'merchandise', 'completed', 'cancelled'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '0.75rem 1.5rem',
                                border: 'none',
                                backgroundColor: activeTab === tab ? '#007bff' : 'transparent',
                                color: activeTab === tab ? 'white' : '#6c757d',
                                borderBottom: activeTab === tab ? '2px solid #007bff' : '2px solid transparent',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: activeTab === tab ? 'bold' : 'normal'
                            }}
                        >
                            {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            {tab === 'normal' && ` (${categorized.normal.length})`}
                            {tab === 'merchandise' && ` (${categorized.merchandise.length})`}
                            {tab === 'completed' && ` (${categorized.completed.length})`}
                            {tab === 'cancelled' && ` (${categorized.cancelled.length})`}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="tab-content">
                    {activeTab === 'normal' && (
                        <div>
                            {categorized.normal.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>
                                    No normal events in your participation history.
                                </p>
                            ) : (
                                categorized.normal.map(renderEventCard)
                            )}
                        </div>
                    )}

                    {activeTab === 'merchandise' && (
                        <div>
                            {categorized.merchandise.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>
                                    No merchandise purchases in your participation history.
                                </p>
                            ) : (
                                categorized.merchandise.map(renderEventCard)
                            )}
                        </div>
                    )}

                    {activeTab === 'completed' && (
                        <div>
                            {categorized.completed.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>
                                    No completed events in your participation history.
                                </p>
                            ) : (
                                categorized.completed.map(renderEventCard)
                            )}
                        </div>
                    )}

                    {activeTab === 'cancelled' && (
                        <div>
                            {categorized.cancelled.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#6c757d', padding: '2rem' }}>
                                    No cancelled or rejected registrations in your participation history.
                                </p>
                            ) : (
                                categorized.cancelled.map(renderEventCard)
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* QR Code Modal */}
            {showQrCode && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000
                    }}
                    onClick={() => setShowQrCode(null)}
                >
                    <div 
                        style={{
                            backgroundColor: 'white',
                            padding: '2rem',
                            borderRadius: '8px',
                            textAlign: 'center',
                            maxWidth: '300px'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Your Ticket QR Code</h3>
                        <img 
                            src={showQrCode} 
                            alt="QR Code" 
                            style={{ 
                                maxWidth: '200px', 
                                maxHeight: '200px',
                                border: '1px solid #ddd',
                                borderRadius: '4px'
                            }} 
                        />
                        <button
                            onClick={() => setShowQrCode(null)}
                            style={{
                                marginTop: '1rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: '#dc3545',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParticipantDashboard;