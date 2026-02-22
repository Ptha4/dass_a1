import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const PASSWORD_RESET_BASE = `${API_BASE}/password-reset`;

function getAuthHeaders() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = user?.token;
    if (!token) throw new Error('Not authenticated');
    return { 'x-auth-token': token };
}

/** Organizer: submit password reset request */
export function submitPasswordResetRequest(body) {
    return axios
        .post(`${PASSWORD_RESET_BASE}/request`, body, { headers: getAuthHeaders() })
        .then((res) => res.data);
}

/** Organizer: get my password reset requests */
export function getMyPasswordResetRequests() {
    return axios
        .get(`${PASSWORD_RESET_BASE}/my-requests`, { headers: getAuthHeaders() })
        .then((res) => res.data);
}

/** Admin: get all password reset requests (optional status filter, pagination) */
export function getAllPasswordResetRequests(params = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.page != null) qs.set('page', params.page);
    if (params.limit != null) qs.set('limit', params.limit);
    const url = qs.toString() ? `${PASSWORD_RESET_BASE}/requests?${qs}` : `${PASSWORD_RESET_BASE}/requests`;
    return axios.get(url, { headers: getAuthHeaders() }).then((res) => res.data);
}

/** Admin: approve or reject a request */
export function processPasswordResetRequest(requestId, { approved, adminComments }) {
    return axios
        .patch(`${PASSWORD_RESET_BASE}/${requestId}/process`, { approved, adminComments }, { headers: getAuthHeaders() })
        .then((res) => res.data);
}

/** Admin: get password reset history for a specific organizer */
export function getOrganizerResetHistory(organizerId) {
    return axios
        .get(`${PASSWORD_RESET_BASE}/history/${organizerId}`, { headers: getAuthHeaders() })
        .then((res) => res.data);
}

const passwordResetService = {
    submitPasswordResetRequest,
    getMyPasswordResetRequests,
    getAllPasswordResetRequests,
    processPasswordResetRequest,
    getOrganizerResetHistory,
};

export default passwordResetService;
