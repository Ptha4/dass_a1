import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';

const EventDetail = () => {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [publishLoading, setPublishLoading] = useState(false);
    const [publishError, setPublishError] = useState(null);

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

    const currentUser = authService.getCurrentUser();
    const isDraft = event.status === 'draft';
    const showEditButton = isDraft && currentUser?.isOrganiser;
    const showPublishButton = isDraft && currentUser?.isOrganiser;

    const organizerName = event.organizerId
        ? (event.organizerId.firstName && event.organizerId.lastName
            ? `${event.organizerId.firstName} ${event.organizerId.lastName}`
            : event.organizerId.email || event.organizerId.username)
        : 'N/A';

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
                {event.registrationLimit != null && <p><strong>Registration limit:</strong> {event.registrationLimit}</p>}
                {event.registrationFee != null && event.registrationFee > 0 && <p><strong>Registration fee:</strong> ₹{event.registrationFee}</p>}
                {event.eventTags && event.eventTags.length > 0 && (
                    <p><strong>Tags:</strong> {event.eventTags.join(', ')}</p>
                )}
            </div>
        </div>
    );
};

export default EventDetail;
