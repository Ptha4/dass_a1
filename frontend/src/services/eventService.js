import axios from 'axios';

const API_URL = 'http://localhost:5000/api/events/';
const REGISTRATION_API_URL = 'http://localhost:5000/api/register/'; // New API URL for registrations

// Create new event
const createEvent = async (eventData, token) => {
    console.log('=== EVENT SERVICE CREATE EVENT DEBUG ===');
    console.log('API URL:', API_URL);
    console.log('Event data received:', eventData);
    console.log('Token provided:', token ? 'Token exists' : 'No token');
    
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    
    console.log('Request config:', config);
    
    try {
        console.log('Making POST request to:', API_URL);
        const response = await axios.post(API_URL, eventData, config);
        console.log('Response received:', response);
        console.log('Response data:', response.data);
        console.log('=== END EVENT SERVICE DEBUG ===');
        return response.data;
    } catch (error) {
        console.error('=== EVENT SERVICE ERROR ===');
        console.error('Axios error:', error);
        console.error('Error response:', error.response);
        console.error('Error status:', error.response?.status);
        console.error('Error data:', error.response?.data);
        console.error('Request URL:', API_URL);
        console.error('Request data:', eventData);
        console.error('=== END EVENT SERVICE ERROR ===');
        throw error;
    }
};

// Get all events (optional params: search, eventType, eligibility, fromDate, toDate, followedOnly, trending)
const getEvents = (params = {}, token = null) => {
    console.log('getEvents called with params:', params);
    const config = token ? { headers: { 'x-auth-token': token } } : {};
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set('search', params.search);
    if (params.eventType) searchParams.set('eventType', params.eventType);
    if (params.eligibility) searchParams.set('eligibility', params.eligibility);
    if (params.fromDate) searchParams.set('fromDate', params.fromDate);
    if (params.toDate) searchParams.set('toDate', params.toDate);
    if (params.followedOnly === true) searchParams.set('followedOnly', 'true');
    if (params.trending) searchParams.set('trending', params.trending);
    if (params.myDrafts === true) searchParams.set('myDrafts', 'true');
    if (params.myEvents === true) searchParams.set('myEvents', 'true');
    if (params.organizerId) searchParams.set('organizerId', params.organizerId);
    const qs = searchParams.toString();
    const url = qs ? `${API_URL}?${qs}` : API_URL;
    console.log('Final URL:', url);
    return axios.get(url, config).then((res) => res.data);
};

// Get current user's draft events (organisers only)
const getMyDrafts = (token) => {
    if (!token) return Promise.resolve([]);
    return getEvents({ myDrafts: true }, token);
};

// Get current user's published events (organisers only)
const getMyEvents = (token) => {
    console.log('getMyEvents called with token:', token ? 'Token exists' : 'No token');
    if (!token) return Promise.resolve([]);
    return getEvents({ myEvents: true }, token);
};

// Get single event by ID
const getEventById = async (id, token) => {
    const config = token ? { headers: { 'x-auth-token': token } } : {};
    const response = await axios.get(`${API_URL}${id}`, config);
    return response.data;
};

// Update event
const updateEvent = async (id, eventData, token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    const response = await axios.put(API_URL + id, eventData, config);
    return response.data;
};

// Update event status
const updateEventStatus = async (id, statusData, token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    const response = await axios.put(API_URL + id + '/status', statusData, config);
    return response.data;
};

// Register for an event or purchase merchandise
const registerForEvent = async (eventId, purchasedItems, token, customFormResponses = null) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    const requestBody = { purchasedItems };
    if (customFormResponses) {
        requestBody.customFormResponses = customFormResponses;
    }
    const response = await axios.post(REGISTRATION_API_URL + eventId, requestBody, config);
    return response.data;
};

// Get user's registrations/tickets
const getMyTickets = async (token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    const response = await axios.get(REGISTRATION_API_URL + 'my-tickets', config);
    return response.data;
};

// Check if user is registered for a specific event
const checkRegistrationStatus = async (eventId, token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    const response = await axios.get(REGISTRATION_API_URL + eventId + '/status', config);
    return response.data;
};

// Get organizer's event analytics
const getEventAnalytics = async (token) => {
    console.log('=== EVENT SERVICE ANALYTICS DEBUG ===');
    console.log('API URL:', 'http://localhost:5000/api/events/analytics');
    console.log('Token provided:', token ? 'Token exists' : 'No token');
    
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    
    console.log('Request config:', config);
    
    try {
        console.log('Making GET request to:', 'http://localhost:5000/api/events/analytics');
        const response = await axios.get('http://localhost:5000/api/events/analytics', config);
        console.log('Analytics response received:', response);
        console.log('Analytics response data:', response.data);
        console.log('=== END EVENT SERVICE ANALYTICS DEBUG ===');
        return response.data;
    } catch (error) {
        console.error('=== EVENT SERVICE ANALYTICS ERROR ===');
        console.error('Axios error:', error);
        console.error('Error response:', error.response);
        console.error('Error status:', error.response?.status);
        console.error('Error data:', error.response?.data);
        console.error('Request URL:', 'http://localhost:5000/api/events/analytics');
        console.error('=== END EVENT SERVICE ANALYTICS ERROR ===');
        throw error;
    }
};

// Upload payment proof for merchandise registration
const uploadPaymentProof = async (registrationId, file, token) => {
    const formData = new FormData();
    formData.append('paymentProof', file);
    
    const config = {
        headers: {
            'x-auth-token': token,
            'Content-Type': 'multipart/form-data',
        },
    };
    
    const response = await axios.post(`${REGISTRATION_API_URL}${registrationId}/payment-proof`, formData, config);
    return response.data;
};

// Get pending payment approvals for organizer
const getPendingApprovals = async (token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    const response = await axios.get(`${REGISTRATION_API_URL}pending-approvals`, config);
    return response.data;
};

// Approve or reject payment
const approvePayment = async (proofId, approved, rejectionReason, token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    const response = await axios.patch(`${REGISTRATION_API_URL}payment-proof/${proofId}`, 
        { approved, rejectionReason }, config);
    return response.data;
};


// Manual override for attendance
const manualOverride = async (registrationId, action, reason, token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    
    const response = await axios.post(`http://localhost:5000/api/attendance/manual-override`, 
        { registrationId, action, reason }, config);
    return response.data;
};

// Get event attendance
const getEventAttendance = async (eventId, token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    
    const response = await axios.get(`http://localhost:5000/api/attendance/${eventId}`, config);
    return response.data;
};

// Scan QR code
const scanQRCode = async (qrData, eventId, token, scanMethod = 'camera') => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    
    const response = await axios.post(`http://localhost:5000/api/attendance/scan`, 
        { qrData, eventId, scanMethod }, config);
    return response.data;
};

// Get event-specific analytics
const getEventAnalyticsById = async (eventId, token) => {
    const config = token ? { headers: { 'x-auth-token': token } } : {};
    const response = await axios.get(`${API_URL}${eventId}/analytics`, config);
    return response.data;
};

// Get event participants
const getEventParticipants = async (eventId, token) => {
    const config = token ? { headers: { 'x-auth-token': token } } : {};
    const response = await axios.get(`${API_URL}${eventId}/participants`, config);
    return response.data;
};

const eventService = {
    createEvent,
    getEvents,
    getMyEvents,
    getMyDrafts,
    updateEvent,
    updateEventStatus,
    getEventById,
    getMyTickets,
    checkRegistrationStatus,
    getEventAnalytics,
    getEventAnalyticsById,
    getEventParticipants,
    uploadPaymentProof,
    getPendingApprovals,
    approvePayment,
    manualOverride,
    getEventAttendance,
    scanQRCode,
    registerForEvent
};

export default eventService;