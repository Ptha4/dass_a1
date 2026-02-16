import axios from 'axios';

const API_BASE = 'http://localhost:5000/api';

function getAuthHeaders() {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = user ? user.token : null;
    if (!token) throw new Error('Not authenticated');
    return { 'x-auth-token': token };
}

const getAdminOrganizers = () => {
    return axios.get(`${API_BASE}/admin/organizers`, { headers: getAuthHeaders() }).then((res) => res.data);
};

const createOrganizer = (data) => {
    return axios.post(`${API_BASE}/admin/organizers`, data, { headers: getAuthHeaders() }).then((res) => res.data);
};

const updateOrganizerStatus = (id, { disabled, archived }) => {
    return axios.patch(`${API_BASE}/admin/organizers/${id}`, { disabled, archived }, { headers: getAuthHeaders() }).then((res) => res.data);
};

const deleteOrganizer = (id) => {
    return axios.delete(`${API_BASE}/admin/organizers/${id}`, { headers: getAuthHeaders() }).then((res) => res.data);
};

const adminService = {
    getAdminOrganizers,
    createOrganizer,
    updateOrganizerStatus,
    deleteOrganizer,
};

export default adminService;
