import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';
import PaymentProofUpload from './PaymentProofUpload';

const EventDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [publishLoading, setPublishLoading] = useState(false);
    const [publishError, setPublishError] = useState(null);

    // New state for registration/purchase
    const [registrationLoading, setRegistrationLoading] = useState(false);
    const [registrationError, setRegistrationError] = useState(null);
    const [registrationSuccess, setRegistrationSuccess] = useState(false);
    const [currentRegistration, setCurrentRegistration] = useState(null); // Track current registration for payment proof
    const [showPaymentProof, setShowPaymentProof] = useState(false);
    const [merchQuantities, setMerchQuantities] = useState({}); // { itemId: quantity }

    const currentUser = authService.getCurrentUser();
    const isOrganizer = currentUser?.isOrganiser;
    const isParticipant = !currentUser?.isOrganiser && (currentUser?.participantType === 'IIIT Participant' || currentUser?.participantType === 'Non-IIIT Participant');

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) {
                setError('No event ID provided.');
                setLoading(false);
                return;
            }
            try {
                const data = await eventService.getEventById(id);
                setEvent(data);
                // Initialize merchQuantities if it's a merch event
                if (data.eventType === 'merch' && data.items) {
                    const initialQuantities = {};
                    data.items.forEach(item => {
                        initialQuantities[item._id] = 0;
                    });
                    setMerchQuantities(initialQuantities);
                }
            } catch (err) {
                setError(err.response?.status === 404
                    ? 'Event not found.'
                    : err.response?.data?.message || err.message || 'Failed to load event.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [id]);

    const handlePublish = async () => {
        const user = authService.getCurrentUser();
        const token = user?.token;
        if (!token) {
            setPublishError('You must be logged in to publish.');
            return;
        }
        setPublishLoading(true);
        setPublishError(null);
        try {
            const updated = await eventService.updateEventStatus(id, { status: 'published' }, token);
            setEvent(updated);
        } catch (err) {
            setPublishError(err.response?.data?.message || err.message || 'Failed to publish event.');
        } finally {
            setPublishLoading(false);
        }
    };

    const handleRegister = async () => {
        const user = authService.getCurrentUser();
        const token = user?.token;
        if (!token) {
            setRegistrationError('You must be logged in to register.');
            return;
        }
        if (!isParticipant) {
            setRegistrationError('Only participants can register for events.');
            return;
        }

        setRegistrationLoading(true);
        setRegistrationError(null);
        setRegistrationSuccess(false);

        try {
            await eventService.registerForEvent(event._id, null, token);
            setRegistrationSuccess(true);
            // Optionally, navigate to a success page or participation history
            navigate('/participant-dashboard');
        } catch (err) {
            setRegistrationError(err.response?.data?.message || err.message || 'Failed to register for event.');
        } finally {
            setRegistrationLoading(false);
        }
    };

    const handleMerchQuantityChange = (itemId, quantity) => {
        setMerchQuantities(prev => ({
            ...prev,
            [itemId]: Math.max(0, parseInt(quantity, 10) || 0) // Ensure non-negative integer
        }));
    };

    const handlePurchase = async () => {
        const user = authService.getCurrentUser();
        const token = user?.token;
        if (!token) {
            setRegistrationError('You must be logged in to purchase merchandise.');
            return;
        }
        if (!isParticipant) {
            setRegistrationError('Only participants can purchase merchandise.');
            return;
        }

        const purchasedItems = Object.entries(merchQuantities)
            .filter(([, quantity]) => quantity > 0)
            .map(([itemId, quantity]) => ({ itemId, quantity }));

        if (purchasedItems.length === 0) {
            setRegistrationError('Please select at least one item to purchase.');
            return;
        }

        // Client-side stock validation (backend will also validate)
        for (const item of purchasedItems) {
            const eventItem = event.items.find(ei => ei._id === item.itemId);
            if (!eventItem || eventItem.stockQuantity < item.quantity) {
                setRegistrationError(`Not enough stock for ${eventItem?.itemName || 'an item'}.`);
                return;
            }
        }

        setRegistrationLoading(true);
        setRegistrationError(null);
        setRegistrationSuccess(false);

        try {
            const result = await eventService.registerForEvent(event._id, purchasedItems, token);
            const registration = result?.registration ?? result;
            console.log('Registration response:', result);
            setCurrentRegistration(registration);
            
            // For merch events, show payment proof upload
            if (event.eventType === 'merch') {
                setShowPaymentProof(true);
                setRegistrationSuccess(true);
            } else {
                // For normal events, navigate to dashboard
                setRegistrationSuccess(true);
                navigate('/participant-dashboard');
            }
        } catch (err) {
            setRegistrationError(err.response?.data?.message || err.message || 'Failed to purchase merchandise.');
        } finally {
            setRegistrationLoading(false);
        }
    };

    const handlePaymentProofUploaded = () => {
        setShowPaymentProof(false);
        setCurrentRegistration(null);
        // Reset form
        const initialQuantities = {};
        event.items.forEach(item => {
            initialQuantities[item._id] = 0;
        });
        setMerchQuantities(initialQuantities);
        setRegistrationSuccess(false);
    };


    if (loading) {
        return <div className="event-detail-container">Loading event...</div>;
    }

    if (error) {
        return (
            <div className="event-detail-container">
                <p className="error-message">{error}</p>
                <Link to="/events">Back to events</Link>
            </div>
        );
    }

    if (!event) {
        return null;
    }

    const showEditButton = event.status === 'draft' && isOrganizer;
    const showPublishButton = event.status === 'draft' && isOrganizer;

    const organizerName = event.organizerId
        ? (event.organizerId.firstName && event.organizerId.lastName
            ? `${event.organizerId.firstName} ${event.organizerId.lastName}`
            : event.organizerId.email || event.organizerId.username)
        : 'N/A';

    const isRegistrationOpen = event.status === 'published' && new Date() < new Date(event.registrationDeadline);
    const isMerchEvent = event.eventType === 'merch';
    const isNormalEvent = event.eventType === 'normal' || event.eventType === 'ticket' || event.eventType === 'rsvp';

    // User can register only if they meet the event's eligibility
    const meetsEligibility = !event.eligibility
        || event.eligibility === 'IIIT and Non-IIIT Participant'
        || (event.eligibility === 'IIIT Participant' && currentUser?.participantType === 'IIIT Participant');

    return (
        <div className="event-detail-container">
            <Link to="/events" style={{ marginBottom: '1rem', display: 'inline-block' }}>← Back to events</Link>
            {showEditButton && (
                <Link to={`/events/${id}/edit`} className="edit-event-button" style={{ marginLeft: '1rem' }}>Edit event</Link>
            )}
            {showPublishButton && (
                <>
                    <button
                        type="button"
                        onClick={handlePublish}
                        disabled={publishLoading}
                        className="publish-event-button"
                        style={{ marginLeft: '1rem' }}
                    >
                        {publishLoading ? 'Publishing...' : 'Publish event'}
                    </button>
                    {publishError && <p className="error-message" style={{ marginTop: '0.5rem' }}>{publishError}</p>}
                </>
            )}
            <div className="event-detail-card">
                <h1>{event.eventName}</h1>
                <p className="event-meta">Status: <strong>{event.status}</strong> · Type: <strong>{event.eventType}</strong></p>
                <p>{event.eventDescription}</p>
                {event.eligibility && <p><strong>Eligibility:</strong> {event.eligibility}</p>}
                <p><strong>Organizer:</strong> {organizerName}</p>
                <p><strong>Starts:</strong> {new Date(event.eventStartDate).toLocaleString()}</p>
                <p><strong>Ends:</strong> {new Date(event.eventEndDate).toLocaleString()}</p>
                <p><strong>Registration deadline:</strong> {new Date(event.registrationDeadline).toLocaleString()}</p>
                {event.registrationLimit != null && (
                    <p><strong>Registration limit:</strong> {event.registrationLimit}</p>
                )}
                {event.remainingRegistrations != null && (
                    <p><strong>Registrations left:</strong> {event.remainingRegistrations}</p>
                )}
                {event.eventType !== 'merch' && event.registrationFee != null && event.registrationFee > 0 && (
                    <p><strong>Registration fee:</strong> ₹{event.registrationFee}</p>
                )}
                {event.eventTags && event.eventTags.length > 0 && (
                    <p><strong>Tags:</strong> {event.eventTags.join(', ')}</p>
                )}

                {/* Registration/Purchase Section */}
                {isRegistrationOpen && currentUser && !isOrganizer && !meetsEligibility && (
                    <p style={{ marginTop: '1rem', color: '#c00' }}>
                        You are not eligible to register for this event. This event is for {event.eligibility === 'IIIT Participant' ? 'IIIT participants only.' : 'certain participants.'}
                    </p>
                )}
                {isRegistrationOpen && currentUser && !isOrganizer && meetsEligibility && (
                    <div className="registration-purchase-section" style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                        {registrationError && <p className="error-message">{registrationError}</p>}
                        {registrationSuccess && !showPaymentProof && <p className="success-message">Operation successful! Redirecting to your tickets...</p>}

                        {/* Show payment proof upload for merch events */}
                        {showPaymentProof && currentRegistration && (
                            <PaymentProofUpload 
                                registrationId={currentRegistration._id || currentRegistration.id} 
                                onUploadSuccess={handlePaymentProofUploaded}
                            />
                        )}

                        {isNormalEvent && (
                            <>
                                <h3>Register for Event</h3>
                                <button
                                    onClick={handleRegister}
                                    disabled={registrationLoading}
                                    className="register-button"
                                >
                                    {registrationLoading ? 'Registering...' : 'Register Now'}
                                </button>
                            </>
                        )}

                        {isMerchEvent && event.items && event.items.length > 0 && (
                            <>
                                <h3>Purchase Merchandise</h3>
                                {event.items.map(item => (
                                    <div key={item._id} className="merch-item-selection" style={{ marginBottom: '1rem' }}>
                                        <p>
                                            <strong>{item.itemName}</strong>{' '}
                                            (Price: ₹{Number(item.price || 0).toFixed(2)} · Stock: {item.stockQuantity})
                                        </p>
                                        <input
                                            type="number"
                                            min="0"
                                            max={item.stockQuantity}
                                            value={merchQuantities[item._id] || 0}
                                            onChange={(e) => handleMerchQuantityChange(item._id, e.target.value)}
                                            style={{ width: '60px', marginRight: '10px' }}
                                            disabled={item.stockQuantity === 0}
                                        />
                                        {item.stockQuantity === 0 && <span style={{ color: 'red' }}>Out of Stock</span>}
                                    </div>
                                ))}
                                <p style={{ fontWeight: 'bold', marginTop: '0.5rem' }}>
                                    Total price:{' '}
                                    ₹{event.items.reduce((sum, item) => {
                                        const qty = merchQuantities[item._id] || 0;
                                        const price = Number(item.price || 0);
                                        return sum + qty * price;
                                    }, 0).toFixed(2)}
                                </p>
                                <button
                                    onClick={handlePurchase}
                                    disabled={
                                        registrationLoading ||
                                        Object.values(merchQuantities).every(qty => qty === 0)
                                    }
                                    className="purchase-button"
                                >
                                    {registrationLoading ? 'Purchasing...' : 'Purchase Selected Items'}
                                </button>
                            </>
                        )}
                    </div>
                )}
                {!isRegistrationOpen && <p style={{ marginTop: '1rem', color: 'gray' }}>Registration is currently closed for this event.</p>}
                {!currentUser && <p style={{ marginTop: '1rem', color: 'gray' }}>Please log in to register or purchase.</p>}
                {isOrganizer && <p style={{ marginTop: '1rem', color: 'gray' }}>Organizers cannot register for their own events.</p>}
            </div>
        </div>
    );
};

export default EventDetail;
