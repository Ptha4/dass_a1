import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';
import forumService from '../services/forumService';
import PaymentProofUpload from './PaymentProofUpload';
import Forum from './Forum';
import CustomRegistrationForm from './CustomRegistrationForm';

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
    const [forumAccess, setForumAccess] = useState(null); // true | false | null (loading)
    const [showCustomForm, setShowCustomForm] = useState(false); // Show custom form modal/section
    const [isRegistered, setIsRegistered] = useState(false); // Track if user is already registered

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

    // Check registration status when event is loaded and user is logged in
    useEffect(() => {
        if (event && currentUser && isParticipant) {
            const checkRegistration = async () => {
                try {
                    const token = currentUser.token;
                    const status = await eventService.checkRegistrationStatus(id, token);
                    setIsRegistered(status.isRegistered);
                    if (status.isRegistered && status.registration) {
                        setCurrentRegistration(status.registration);
                    }
                } catch (err) {
                    console.error('Error checking registration status:', err);
                    setIsRegistered(false);
                }
            };
            checkRegistration();
        }
    }, [event, currentUser, id, isParticipant]);

    // Check forum access when event is loaded and user is logged in
    useEffect(() => {
        if (!event || !currentUser || event.status !== 'published') {
            setForumAccess(null);
            return;
        }
        const checkAccess = async () => {
            try {
                await forumService.checkForumAccess(id);
                setForumAccess(true);
            } catch (err) {
                setForumAccess(err.response?.status === 403 ? false : null);
            }
        };
        checkAccess();
    }, [id, event, currentUser]);

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

        // Check if event has a custom registration form
        if (event.registrationForm && event.registrationForm.length > 0) {
            // Show custom form instead of direct registration
            setShowCustomForm(true);
            return;
        }

        // Direct registration if no custom form
        performRegistration(null, token);
    };

    const performRegistration = async (customFormResponses, token) => {
        setRegistrationLoading(true);
        setRegistrationError(null);
        setRegistrationSuccess(false);

        try {
            await eventService.registerForEvent(event._id, null, token, customFormResponses);
            setRegistrationSuccess(true);
            // Optionally, navigate to a success page or participation history
            navigate('/participant-dashboard');
        } catch (err) {
            setRegistrationError(err.response?.data?.message || err.message || 'Failed to register for event.');
        } finally {
            setRegistrationLoading(false);
            setShowCustomForm(false);
        }
    };

    const handleCustomFormSubmit = (formData) => {
        const user = authService.getCurrentUser();
        const token = user?.token;
        performRegistration(formData, token);
    };

    const handleMerchQuantityChange = (itemId, quantity) => {
        const newQuantity = Math.max(0, parseInt(quantity, 10) || 0); // Ensure non-negative integer
        
        // Find the item to check purchase limits
        const item = event.items.find(i => i._id === itemId);
        if (!item) return;
        
        // Enforce item-level purchase limit
        if (item.purchaseLimitPerParticipant > 0 && newQuantity > item.purchaseLimitPerParticipant) {
            return; // Don't update if it exceeds the limit
        }
        
        // Enforce stock limit
        if (newQuantity > item.stockQuantity) {
            return; // Don't update if it exceeds stock
        }
        
        setMerchQuantities(prev => ({
            ...prev,
            [itemId]: newQuantity
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

        // Event-level purchase limit validation
        const totalItems = purchasedItems.reduce((sum, item) => sum + item.quantity, 0);
        if (event.purchaseLimitPerParticipant > 0 && totalItems > event.purchaseLimitPerParticipant) {
            setRegistrationError(`Event purchase limit exceeded. You can purchase maximum ${event.purchaseLimitPerParticipant} items total for this event. You're trying to purchase ${totalItems} items.`);
            return;
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
                                {isRegistered ? (
                                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                        <p className="font-medium">✓ You are already registered for this event</p>
                                        <p className="text-sm mt-1">Registration Date: {new Date(currentRegistration?.registrationDate).toLocaleDateString()}</p>
                                        <p className="text-sm">Status: {currentRegistration?.status}</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleRegister}
                                        disabled={registrationLoading}
                                        className="register-button"
                                    >
                                        {registrationLoading ? 'Registering...' : 'Register Now'}
                                    </button>
                                )}
                            </>
                        )}

                        {isMerchEvent && event.items && event.items.length > 0 && (
                            <>
                                <h3>Purchase Merchandise</h3>
                                {event.purchaseLimitPerParticipant > 0 && (
                                    <div style={{ 
                                        backgroundColor: '#fff3cd', 
                                        border: '1px solid #ffeaa7', 
                                        borderRadius: '8px', 
                                        padding: '0.75rem', 
                                        marginBottom: '1rem',
                                        fontSize: '0.9rem'
                                    }}>
                                        <strong>🛒 Event Purchase Limit:</strong> You can purchase maximum {event.purchaseLimitPerParticipant} items total for this event.
                                    </div>
                                )}
                                {isRegistered ? (
                                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
                                        <p className="font-medium">✓ You have already purchased from this event</p>
                                        <p className="text-sm mt-1">Purchase Date: {new Date(currentRegistration?.registrationDate).toLocaleDateString()}</p>
                                        <p className="text-sm">Status: {currentRegistration?.status}</p>
                                        {currentRegistration?.purchasedItems && (
                                            <div className="mt-2">
                                                <p className="text-sm font-medium">Items Purchased:</p>
                                                {currentRegistration.purchasedItems.map((item, index) => (
                                                    <p key={index} className="text-sm">• {item.item.itemName} (x{item.quantity})</p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        {event.items.map(item => (
                                            <div key={item._id} className="merch-item-selection" style={{ marginBottom: '1rem' }}>
                                                <p>
                                                    <strong>{item.itemName}</strong>{' '}
                                                    (Price: ₹{Number(item.price || 0).toFixed(2)} · Stock: {item.stockQuantity})
                                                    {item.purchaseLimitPerParticipant > 0 && (
                                                        <span style={{ color: '#ff6b6b', fontWeight: 'bold' }}>
                                                            {' '}· Limit: {item.purchaseLimitPerParticipant} per person
                                                        </span>
                                                    )}
                                                </p>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={Math.min(item.stockQuantity, item.purchaseLimitPerParticipant > 0 ? item.purchaseLimitPerParticipant : item.stockQuantity)}
                                                    value={merchQuantities[item._id] || 0}
                                                    onChange={(e) => handleMerchQuantityChange(item._id, e.target.value)}
                                                    style={{ width: '60px', marginRight: '10px' }}
                                                    disabled={item.stockQuantity === 0}
                                                />
                                                {item.stockQuantity === 0 && <span style={{ color: 'red' }}>Out of Stock</span>}
                                                {item.purchaseLimitPerParticipant > 0 && (
                                                    <span style={{ fontSize: '0.85rem', color: '#666' }}>
                                                        Max {item.purchaseLimitPerParticipant} per person
                                                    </span>
                                                )}
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
                            </>
                        )}
                    </div>
                )}
                {!isRegistrationOpen && <p style={{ marginTop: '1rem', color: 'gray' }}>Registration is currently closed for this event.</p>}
                {!currentUser && <p style={{ marginTop: '1rem', color: 'gray' }}>Please log in to register or purchase.</p>}
                {isOrganizer && <p style={{ marginTop: '1rem', color: 'gray' }}>Organizers cannot register for their own events.</p>}
            </div>
            
            {/* Discussion Forum Section — only for registered participants and organizers */}
            {currentUser && event.status === 'published' && (
                <div className="forum-section mt-8">
                    <hr className="my-8 border-gray-300" />
                    {forumAccess === false && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
                            <p className="font-medium">Join the discussion</p>
                            <p className="text-sm mt-1">Register for this event to post messages, ask questions, and interact with other participants and organizers.</p>
                        </div>
                    )}
                    {forumAccess === true && (
                        <Forum 
                            eventId={id} 
                            isUserOrganizer={isOrganizer}
                        />
                    )}
                    {forumAccess === null && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-gray-600 text-sm">Checking forum access...</div>
                    )}
                </div>
            )}

        {/* Custom Registration Form Modal */}
        {showCustomForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Registration Form</h2>
                        <button
                            onClick={() => setShowCustomForm(false)}
                            className="text-gray-500 hover:text-gray-700"
                        >
                            ×
                        </button>
                    </div>
                    <CustomRegistrationForm
                        registrationForm={event.registrationForm}
                        onSubmit={handleCustomFormSubmit}
                        loading={registrationLoading}
                    />
                    {registrationError && (
                        <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                            {registrationError}
                        </div>
                    )}
                </div>
            </div>
        )}
        </div>
    );
};

export default EventDetail;
