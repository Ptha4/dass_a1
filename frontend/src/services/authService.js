import axios from 'axios';

const API_URL = 'http://localhost:5000/api/auth/'; // Assuming backend runs on port 5000

const register = (userData) => {
    return axios.post(API_URL + 'register', userData);
};

const login = (email, password) => {
    return axios.post(API_URL + 'login', { email, password })
        .then((response) => {
            if (response.data.token) {
                localStorage.setItem('user', JSON.stringify({
                    token: response.data.token,
                    isAdmin: response.data.isAdmin,
                    isOrganiser: response.data.isOrganiser,
                    participantType: response.data.participantType, // Store participantType
                    onboardingComplete: response.data.onboardingComplete // Store onboarding status
                }));
            }
            return response.data;
        });
};

const logout = () => {
    localStorage.removeItem('user');
};

const getCurrentUser = () => {
    return JSON.parse(localStorage.getItem('user'));
};

const getProfile = (token) => {
    return axios.get(API_URL + 'user', {
        headers: { 'x-auth-token': token },
    }).then((res) => res.data);
};

const updateProfile = (data, token) => {
    return axios.put(API_URL + 'profile', data, {
        headers: { 'x-auth-token': token },
    }).then((res) => res.data);
};

const changePassword = (currentPassword, newPassword, token) => {
    return axios.post(API_URL + 'change-password', { currentPassword, newPassword }, {
        headers: { 'x-auth-token': token },
    }).then((res) => res.data);
};

const authService = {
    register,
    login,
    logout,
    getCurrentUser,
    getProfile,
    updateProfile,
    changePassword,
};

export default authService;