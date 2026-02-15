import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/'; // Base URL for our API

const getOrganizers = () => {
    return axios.get(API_BASE_URL + 'organizers');
};

const saveOnboardingPreferences = (organizerIds) => {
    const user = JSON.parse(localStorage.getItem('user'));
    const token = user ? user.token : null;

    if (!token) {
        return Promise.reject('No authentication token found.');
    }

    return axios.post(
        API_BASE_URL + 'participants/onboarding',
        { organizerIds },
        {
            headers: {
                'x-auth-token': token,
            },
        }
    );
};

const onboardingService = {
    getOrganizers,
    saveOnboardingPreferences,
};

export default onboardingService;