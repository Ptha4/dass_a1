import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import eventService from '../services/eventService';
import FormBuilder from './FormBuilder';
import '../components/CreateEvent.css';

const dateIn5Days = () => {
    const d = new Date();
    d.setDate(d.getDate() + 5);
    return d.toISOString().slice(0, 10);
};

const CreateEvent = () => {
    const [formData, setFormData] = useState({
        eventName: '',
        eventDescription: '',
        eventType: 'normal',
        eligibility: 'IIIT and Non-IIIT Participant',
        registrationDeadline: dateIn5Days(),
        eventStartDate: dateIn5Days(),
        eventEndDate: dateIn5Days(),
        registrationLimit: 1,
        registrationFee: 0,
        eventTags: 'none',
        location: 'IIIT Hyderabad', // Added location
        purchaseLimitPerParticipant: 0, // Event-level purchase limit
        items: [], // New state for merch items
    });
    const [customFormFields, setCustomFormFields] = useState([]); // New state for custom form fields
    const [errors, setErrors] = useState({}); // State for validation errors
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
        location, // Destructure location
        purchaseLimitPerParticipant, // Destructure event-level purchase limit
        items, // Destructure items
    } = formData;

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        // Clear error for the field being changed
        if (errors[e.target.name]) {
            setErrors(prevErrors => ({ ...prevErrors, [e.target.name]: null }));
        }
    };

    // Handle changes for merch items
    const handleItemChange = (index, e) => {
        const newItems = [...items];
        newItems[index][e.target.name] = e.target.value;
        setFormData({ ...formData, items: newItems });
    };

    const handleAddItem = () => {
        setFormData({ ...formData, items: [...items, { itemName: '', stockQuantity: 0, price: 0, purchaseLimitPerParticipant: 0 }] });
    };

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setFormData({ ...formData, items: newItems });
    };

    // Callback function to receive form fields from FormBuilder
    const handleCustomFormChange = (fields) => {
        setCustomFormFields(fields);
    };

    const validateForm = () => {
        const newErrors = {};
        if (!eventName) newErrors.eventName = 'Event Name is required.';
        if (!eventDescription) newErrors.eventDescription = 'Event Description is required.';
        if (!location) newErrors.location = 'Location is required.'; // Added validation for location
        if (!registrationDeadline) newErrors.registrationDeadline = 'Registration Deadline is required.';
        if (!eventStartDate) newErrors.eventStartDate = 'Event Start Date is required.';
        if (!eventEndDate) newErrors.eventEndDate = 'Event End Date is required.';

        // Date validations
        const start = new Date(eventStartDate);
        const end = new Date(eventEndDate);
        const deadline = new Date(registrationDeadline);

        if (eventStartDate && eventEndDate && start > end) {
            newErrors.eventEndDate = 'Event End Date cannot be before Event Start Date.';
        }
        if (registrationDeadline && eventStartDate && deadline > start) {
            newErrors.registrationDeadline = 'Registration Deadline cannot be after Event Start Date.';
        }

        // Numeric validations
        if (registrationLimit && isNaN(Number(registrationLimit))) {
            newErrors.registrationLimit = 'Registration Limit must be a number.';
        }
        if (eventType !== 'merch' && registrationFee && isNaN(Number(registrationFee))) {
            newErrors.registrationFee = 'Registration Fee must be a number.';
        }

        // Merch items validation
        if (eventType === 'merch') {
            if (!items || items.length === 0) {
                newErrors.items = 'Merch events must include at least one item.';
            } else {
                items.forEach((item, index) => {
                    if (!item.itemName || item.itemName.trim() === '') {
                        newErrors[`itemName-${index}`] = `Item ${index + 1}: Name is required.`;
                    }
                    if (isNaN(Number(item.stockQuantity)) || Number(item.stockQuantity) < 0) {
                        newErrors[`stockQuantity-${index}`] = `Item ${index + 1}: Stock quantity must be a non-negative number.`;
                    }
                    if (isNaN(Number(item.price)) || Number(item.price) < 0) {
                        newErrors[`price-${index}`] = `Item ${index + 1}: Price must be a non-negative number.`;
                    }
                });
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({}); // Clear all errors at the beginning of submission

        if (!validateForm()) {
            setLoading(false);
            return;
        }

        try {
            const user = JSON.parse(localStorage.getItem('user'));
            const token = user ? user.token : null;

            console.log('=== TOKEN VALIDATION DEBUG ===');
            console.log('User from localStorage:', user);
            console.log('Token extracted:', token);
            console.log('Token length:', token ? token.length : 'No token');
            
            if (!token) {
                setErrors({ general: 'You need to be logged in to create an event.' });
                setLoading(false);
                return;
            }

            // Decode token to check its content (without verification)
            try {
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    console.log('Token payload:', payload);
                    console.log('Token expires at:', new Date(payload.exp * 1000));
                    console.log('Current time:', new Date());
                    console.log('Token expired?', payload.exp * 1000 < Date.now());
                } else {
                    console.error('Invalid token format - expected 3 parts, got:', tokenParts.length);
                }
            } catch (tokenErr) {
                console.error('Error decoding token:', tokenErr);
            }
            console.log('=== END TOKEN VALIDATION ===');

            console.log('User object before creating event:', user);
            console.log('Token before creating event:', token);

            const eventData = {
                ...formData,
                registrationLimit: registrationLimit ? Number(registrationLimit) : undefined,
                // For merch events, registration fee is not used
                registrationFee: eventType === 'merch' ? undefined : (registrationFee ? Number(registrationFee) : undefined),
                eventTags: eventTags || '', // Backend expects string and will split
                registrationForm: customFormFields, // Backend expects registrationForm
                purchaseLimitPerParticipant: eventType === 'merch' ? (purchaseLimitPerParticipant ? Number(purchaseLimitPerParticipant) : 0) : 0, // Event-level limit
                items: eventType === 'merch'
                    ? items.map(item => ({
                        ...item,
                        stockQuantity: Number(item.stockQuantity),
                        price: item.price !== undefined ? Number(item.price) : 0,
                        purchaseLimitPerParticipant: item.purchaseLimitPerParticipant ? Number(item.purchaseLimitPerParticipant) : 0 // Item-level limit
                    }))
                    : [], // Send items for merch events
            };
            console.log('Event data being sent:', eventData);

            await eventService.createEvent(eventData, token);
            navigate('/organiser-dashboard'); // Redirect to drafts
        } catch (err) {
            console.error('=== CREATE EVENT ERROR DEBUG ===');
            console.error('Full error object:', err);
            console.error('Error response:', err.response);
            console.error('Error response data:', err.response?.data);
            console.error('Error response status:', err.response?.status);
            console.error('Error response headers:', err.response?.headers);
            console.error('Error message:', err.message);
            console.error('Error stack:', err.stack);
            console.error('=== END DEBUG INFO ===');
            
            // Extract detailed error message
            let errorMessage = 'Failed to create event. Please try again.';
            
            if (err.response?.data?.msg === 'Token is not valid') {
                errorMessage = 'Your session has expired. Please log in again.';
                // Clear the invalid token
                localStorage.removeItem('user');
                // Redirect to login after a short delay
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else if (err.response?.data?.message) {
                errorMessage = err.response.data.message;
            } else if (err.response?.data?.error) {
                errorMessage = err.response.data.error;
            } else if (err.response?.data) {
                errorMessage = JSON.stringify(err.response.data);
            } else if (err.message) {
                errorMessage = err.message;
            }
            
            setErrors({ general: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-event-container">
            <h1>Create New Event</h1>
            <form onSubmit={onSubmit} className="create-event-form">
                {errors.general && <p className="error-message">{errors.general}</p>}
                <div className="form-group">
                    <label htmlFor="eventName">Event Name</label>
                    <input
                        type="text"
                        id="eventName"
                        name="eventName"
                        value={eventName}
                        onChange={onChange}
                        required
                    />
                    {errors.eventName && <p className="error-message">{errors.eventName}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="eventDescription">Event Description</label>
                    <textarea
                        id="eventDescription"
                        name="eventDescription"
                        value={eventDescription}
                        onChange={onChange}
                        required
                    ></textarea>
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
                    <label htmlFor="location">Location</label>
                    <input
                        type="text"
                        id="location"
                        name="location"
                        value={location}
                        onChange={onChange}
                        required
                    />
                    {errors.location && <p className="error-message">{errors.location}</p>}
                </div>

                {eventType === 'merch' && (
                    <div className="merch-items-section">
                        <h3>Merch Items</h3>
                        {errors.items && <p className="error-message">{errors.items}</p>}
                        {items.map((item, index) => (
                            <div key={index} className="merch-item-input-group">
                                <input
                                    type="text"
                                    name="itemName"
                                    placeholder="Item Name"
                                    value={item.itemName}
                                    onChange={(e) => handleItemChange(index, e)}
                                    required
                                />
                                {errors[`itemName-${index}`] && <p className="error-message">{errors[`itemName-${index}`]}</p>}
                                <input
                                    type="number"
                                    name="stockQuantity"
                                    placeholder="Stock Quantity"
                                    value={item.stockQuantity}
                                    onChange={(e) => handleItemChange(index, e)}
                                    min="0"
                                    required
                                />
                                {errors[`stockQuantity-${index}`] && <p className="error-message">{errors[`stockQuantity-${index}`]}</p>}
                                <input
                                    type="number"
                                    name="price"
                                    placeholder="Price per item"
                                    value={item.price}
                                    onChange={(e) => handleItemChange(index, e)}
                                    min="0"
                                    step="0.01"
                                    required
                                />
                                {errors[`price-${index}`] && <p className="error-message">{errors[`price-${index}`]}</p>}
                                <input
                                    type="number"
                                    name="purchaseLimitPerParticipant"
                                    placeholder="Limit per person (0 = no limit)"
                                    value={item.purchaseLimitPerParticipant || 0}
                                    onChange={(e) => handleItemChange(index, e)}
                                    min="0"
                                    title="Maximum quantity each participant can purchase for this item. 0 means no limit."
                                />
                                {errors[`purchaseLimitPerParticipant-${index}`] && <p className="error-message">{errors[`purchaseLimitPerParticipant-${index}`]}</p>}
                                <button type="button" onClick={() => handleRemoveItem(index)}>Remove</button>
                            </div>
                        ))}
                        <button type="button" onClick={handleAddItem}>Add Item</button>
                    </div>
                )}

                {eventType === 'merch' && (
                    <div className="form-group">
                        <label htmlFor="purchaseLimitPerParticipant">Event Purchase Limit per Participant</label>
                        <input
                            type="number"
                            id="purchaseLimitPerParticipant"
                            name="purchaseLimitPerParticipant"
                            value={purchaseLimitPerParticipant || 0}
                            onChange={onChange}
                            min="0"
                            placeholder="0 = no limit"
                            title="Maximum total items each participant can purchase for this event. 0 means no limit."
                        />
                        <small style={{ color: '#666', display: 'block', marginTop: '0.25rem' }}>
                            Maximum total items each participant can purchase for this event. 0 means no limit.
                        </small>
                        {errors.purchaseLimitPerParticipant && <p className="error-message">{errors.purchaseLimitPerParticipant}</p>}
                    </div>
                )}

                <div className="form-group">
                    <label htmlFor="eligibility">Eligibility</label>
                    <select id="eligibility" name="eligibility" value={eligibility} onChange={onChange}>
                        <option value="IIIT Participant">IIIT Participant</option>
                        <option value="IIIT and Non-IIIT Participant">IIIT and Non-IIIT Participant</option>
                    </select>
                </div>
                <div className="form-group">
                    <label htmlFor="registrationDeadline">Registration Deadline</label>
                    <input
                        type="date"
                        id="registrationDeadline"
                        name="registrationDeadline"
                        value={registrationDeadline}
                        onChange={onChange}
                        required
                    />
                    {errors.registrationDeadline && <p className="error-message">{errors.registrationDeadline}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="eventStartDate">Event Start Date</label>
                    <input
                        type="date"
                        id="eventStartDate"
                        name="eventStartDate"
                        value={eventStartDate}
                        onChange={onChange}
                        required
                    />
                    {errors.eventStartDate && <p className="error-message">{errors.eventStartDate}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="eventEndDate">Event End Date</label>
                    <input
                        type="date"
                        id="eventEndDate"
                        name="eventEndDate"
                        value={eventEndDate}
                        onChange={onChange}
                        required
                    />
                    {errors.eventEndDate && <p className="error-message">{errors.eventEndDate}</p>}
                </div>
                <div className="form-group">
                    <label htmlFor="registrationLimit">Registration Limit</label>
                    <input
                        type="number"
                        id="registrationLimit"
                        name="registrationLimit"
                        value={registrationLimit}
                        onChange={onChange}
                    />
                    {errors.registrationLimit && <p className="error-message">{errors.registrationLimit}</p>}
                </div>
                {eventType !== 'merch' && (
                    <div className="form-group">
                        <label htmlFor="registrationFee">Registration Fee</label>
                        <input
                            type="number"
                            id="registrationFee"
                            name="registrationFee"
                            value={registrationFee}
                            onChange={onChange}
                        />
                        {errors.registrationFee && <p className="error-message">{errors.registrationFee}</p>}
                    </div>
                )}
                <div className="form-group">
                    <label htmlFor="eventTags">Event Tags (comma-separated)</label>
                    <input
                        type="text"
                        id="eventTags"
                        name="eventTags"
                        value={eventTags}
                        onChange={onChange}
                    />
                </div>

                <FormBuilder onFormChange={handleCustomFormChange} /> {/* Render FormBuilder */}

                <button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Event'}
                </button>
            </form>
        </div>
    );
};

export default CreateEvent;