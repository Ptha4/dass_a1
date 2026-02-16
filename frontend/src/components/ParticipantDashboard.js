import React, { useEffect, useState } from 'react';
import eventService from '../services/eventService';
import authService from '../services/authService';
import { Link } from 'react-router-dom';

const ParticipantDashboard = () => {
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showQrCode, setShowQrCode] = useState(null); // State to control QR code modal/display

    useEffect(() => {
        const fetchMyTickets = async () => {
            const user = authService.getCurrentUser();
            const token = user?.token;

            if (!token) {
                setError('You must be logged in to view your tickets.');
                setLoading(false);
                return;
            }

            try {
                const data = await eventService.getMyTickets(token);
                setRegistrations(data);
            } catch (err) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch your tickets.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchMyTickets();
    }, []);

    if (loading) {
        return <div className="participant-dashboard-container">Loading your tickets...</div>;
    }

    if (error) {
        return (
            <div className="participant-dashboard-container">
                <p className="error-message">{error}</p>
                <Link to="/login">Login</Link>
            </div>
        );
    }

    return (
        <div className="participant-dashboard-container">
            <h2>My Participation History</h2>
            {registrations.length === 0 ? (
                <p>You haven't registered for any events or purchased any merchandise yet.</p>
            ) : (
                <div className="registrations-list">
                    {registrations.map(reg => (
                        <div key={reg._id} className="registration-card">
                            <h3>{reg.event?.eventName || 'Event'}</h3>
                            <p><strong>Event Type:</strong> {reg.event?.eventType ?? '—'}</p>
                            <p><strong>Date:</strong> {reg.event?.eventStartDate ? new Date(reg.event.eventStartDate).toLocaleDateString() : '—'}</p>
                            <p><strong>Location:</strong> {reg.event?.location || reg.event?.eventLocation || '—'}</p>
                            <p><strong>Registration Date:</strong> {new Date(reg.registrationDate).toLocaleDateString()}</p>
                            <p><strong>Status:</strong> {reg.status}</p>

                            {reg.purchasedItems && reg.purchasedItems.length > 0 && (
                                <div className="purchased-items">
                                    <h4>Purchased Items:</h4>
                                    <ul>
                                        {reg.purchasedItems.map((item, index) => (
                                            <li key={index}>{item.item.itemName} (x{item.quantity})</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {reg.ticket && (
                                <div className="ticket-info">
                                    <h4>Ticket Details:</h4>
                                    <p><strong>Ticket ID:</strong> {reg.ticket.ticketId}</p>
                                    {reg.ticket.qrCodeData && (
                                        <button onClick={() => setShowQrCode(reg.ticket.qrCodeData)}>View QR Code</button>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showQrCode && (
                <div className="qr-code-modal-overlay" onClick={() => setShowQrCode(null)}>
                    <div className="qr-code-modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>Your Ticket QR Code</h3>
                        <img src={showQrCode} alt="QR Code" style={{ maxWidth: '200px', maxHeight: '200px' }} />
                        <button onClick={() => setShowQrCode(null)}>Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParticipantDashboard;