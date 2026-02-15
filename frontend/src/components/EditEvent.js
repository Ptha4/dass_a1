import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import eventService from '../services/eventService';
import FormBuilder from './FormBuilder';
import './CreateEvent.css';

const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 10);
};

const EditEvent = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        eventName: '',
        eventDescription: '',
        eventType: 'normal',
        eligibility: '',
        registrationDeadline: '',
        eventStartDate: '',
        eventEndDate: '',
        registrationLimit: '',
        registrationFee: '',
        eventTags: '',
    });
    const [customFormFields, setCustomFormFields] = useState([]);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    const {
        eventName,
        eventDescription,
        eventType,
        eligibility,
        registrationDeadline,
        eventStartDate,
        eventEndDate,
        registrationLimit,
        registrationFee,
        eventTags,
    } = formData;

    useEffect(() => {
        const fetchEvent = async () => {
            if (!id) {
                setFetchError('No event ID.');
                setFetchLoading(false);
                return;
            }
            try {
                const event = await eventService.getEventById(id);
                if (event.status !== 'draft') {
                    setFetchError('Only draft events can be edited.');
                    setFetchLoading(false);
                    return;
                }
                setFormData({
                    eventName: event.eventName || '',
                    eventDescription: event.eventDescription || '',
                    eventType: event.eventType || 'normal',
                    eligibility: event.eligibility || '',
                    registrationDeadline: formatDateForInput(event.registrationDeadline),
                    eventStartDate: formatDateForInput(event.eventStartDate),
                    eventEndDate: formatDateForInput(event.eventEndDate),
                    registrationLimit: event.registrationLimit != null ? String(event.registrationLimit) : '',
                    registrationFee: event.registrationFee != null ? String(event.registrationFee) : '',
                    eventTags: Array.isArray(event.eventTags) ? event.eventTags.join(', ') : (event.eventTags || ''),
                });
                setCustomFormFields(Array.isArray(event.registrationForm) ? event.registrationForm : []);
            } catch (err) {
                setFetchError(err.response?.status === 404 ? 'Event not found.' : err.response?.data?.message || err.message || 'Failed to load event.');
            } finally {
                setFetchLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        if (errors[e.target.name]) {
            setErrors(prev => ({ ...prev, [e.target.name]: null }));
        }
    };

    const handleCustomFormChange = (fields) => {
        setCustomFormFields(fields);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!eventName) newErrors.eventName = 'Event Name is required.';
        if (!eventDescription) newErrors.eventDescription = 'Event Description is required.';
        if (!registrationDeadline) newErrors.registrationDeadline = 'Registration Deadline is required.';
        if (!eventStartDate) newErrors.eventStartDate = 'Event Start Date is required.';
        if (!eventEndDate) newErrors.eventEndDate = 'Event End Date is required.';

        const start = new Date(eventStartDate);
        const end = new Date(eventEndDate);
        const deadline = new Date(registrationDeadline);

        if (eventStartDate && eventEndDate && start > end) {
            newErrors.eventEndDate = 'Event End Date cannot be before Event Start Date.';
        }
        if (registrationDeadline && eventStartDate && deadline > start) {
            newErrors.registrationDeadline = 'Registration Deadline cannot be after Event Start Date.';
        }

        if (registrationLimit && isNaN(Number(registrationLimit))) {
            newErrors.registrationLimit = 'Registration Limit must be a number.';
        }
        if (registrationFee && isNaN(Number(registrationFee))) {
            newErrors.registrationFee = 'Registration Fee must be a number.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const token = user ? user.token : null;

            if (!token) {
                setErrors({ general: 'You must be logged in to edit an event.' });
                setLoading(false);
                return;
            }

            const eventData = {
                ...formData,
                registrationLimit: registrationLimit ? Number(registrationLimit) : undefined,
                registrationFee: registrationFee ? Number(registrationFee) : undefined,
                eventTags: eventTags ? eventTags.split(',').map(t => t.trim()).filter(Boolean) : [],
                registrationForm: customFormFields,
            };

            await eventService.updateEvent(id, eventData, token);
            navigate(`/events/${id}`);
        } catch (err) {
            setErrors({ general: err.response?.data?.message || err.message || 'Failed to update event.' });
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (fetchLoading) {
        return <div className="create-event-container">Loading event...</div>;
    }

    if (fetchError) {
        return (
            <div className="create-event-container">
                <p className="error-message">{fetchError}</p>
                <Link to="/events">Back to events</Link>
            </div>
        );
    }

    return (
        <div className="create-event-container">
            <h1>Edit Event</h1>
            <form onSubmit={onSubmit} className="create-event-form">
                {errors.general && <p className="error-message">{errors.general}</p>}
                <div className="form-group">
                    <label htmlFor="eventName">Event Name</label>
                    <input type="text" id="eventName" name="eventName" value={eventName} onChange={onChange} required />
                    {errors.eventName && <p className="error-message">{errors.eventName}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="eventDescription">Event Description</label>
                    <textarea id="eventDescription" name="eventDescription" value={eventDescription} onChange={onChange} required />
                    {errors.eventDescription && <p className="error-message">{errors.eventDescription}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="eventType">Event Type</label>
                    <select id="eventType" name="eventType" value={eventType} onChange={onChange}>
                        <option value="normal">Normal</option>
                        <option value="merch">Merch</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="eligibility">Eligibility</label>
                    <input type="text" id="eligibility" name="eligibility" value={eligibility} onChange={onChange} />
                </div>
                <div className="form-group">
                    <label htmlFor="registrationDeadline">Registration Deadline</label>
                    <input type="date" id="registrationDeadline" name="registrationDeadline" value={registrationDeadline} onChange={onChange} required />
                    {errors.registrationDeadline && <p className="error-message">{errors.registrationDeadline}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="eventStartDate">Event Start Date</label>
                    <input type="date" id="eventStartDate" name="eventStartDate" value={eventStartDate} onChange={onChange} required />
                    {errors.eventStartDate && <p className="error-message">{errors.eventStartDate}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="eventEndDate">Event End Date</label>
                    <input type="date" id="eventEndDate" name="eventEndDate" value={eventEndDate} onChange={onChange} required />
                    {errors.eventEndDate && <p className="error-message">{errors.eventEndDate}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="registrationLimit">Registration Limit</label>
                    <input type="number" id="registrationLimit" name="registrationLimit" value={registrationLimit} onChange={onChange} />
                    {errors.registrationLimit && <p className="error-message">{errors.registrationLimit}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="registrationFee">Registration Fee</label>
                    <input type="number" id="registrationFee" name="registrationFee" value={registrationFee} onChange={onChange} />
                    {errors.registrationFee && <p className="error-message">{errors.registrationFee}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="eventTags">Event Tags (comma-separated)</label>
                    <input type="text" id="eventTags" name="eventTags" value={eventTags} onChange={onChange} />
                </div>

                <FormBuilder onFormChange={handleCustomFormChange} initialFormFields={customFormFields} />

                <button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save changes'}
                </button>
            </form>
        </div>
    );
};

export default EditEvent;
