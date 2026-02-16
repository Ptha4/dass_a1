import axios from 'axios';

const API_URL = 'http://localhost:5000/api/events/';
const REGISTRATION_API_URL = 'http://localhost:5000/api/register/'; // New API URL for registrations

// Create new event
const createEvent = async (eventData, token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    const response = await axios.post(API_URL, eventData, config);
    return response.data;
};

// Get all events
const getEvents = async () => {
    const response = await axios.get(API_URL);
    return response.data;
};

// Get single event by ID
const getEventById = async (id) => {
    const response = await axios.get(API_URL + id);
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
const registerForEvent = async (eventId, purchasedItems, token) => {
    const config = {
        headers: {
            'x-auth-token': token,
        },
    };
    const response = await axios.post(REGISTRATION_API_URL + eventId, { purchasedItems }, config);
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


const eventService = {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    updateEventStatus,
    registerForEvent, // Add new function
    getMyTickets,     // Add new function
};

export default eventService;