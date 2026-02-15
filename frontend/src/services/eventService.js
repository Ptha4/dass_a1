import axios from 'axios';

const API_URL = 'http://localhost:5000/api/events/';

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

const eventService = {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    updateEventStatus,
};

export default eventService;