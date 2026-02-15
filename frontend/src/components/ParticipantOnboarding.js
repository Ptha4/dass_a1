import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import onboardingService from '../services/onboardingService';
import authService from '../services/authService'; // To get current user info

const ParticipantOnboarding = () => {
    const [organizers, setOrganizers] = useState([]);
    const [selectedOrganizers, setSelectedOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrganizers = async () => {
            try {
                const response = await onboardingService.getOrganizers();
                setOrganizers(response.data);
            } catch (err) {
                setError('Failed to fetch organizers.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrganizers();
    }, []);

    const handleCheckboxChange = (organizerId) => {
        setSelectedOrganizers((prevSelected) =>
            prevSelected.includes(organizerId)
                ? prevSelected.filter((id) => id !== organizerId)
                : [...prevSelected, organizerId]
        );
    };

    const handleSavePreferences = async () => {
        setLoading(true);
        try {
            await onboardingService.saveOnboardingPreferences(selectedOrganizers);
            // Update local storage user to reflect onboarding completion
            const user = authService.getCurrentUser();
            if (user) {
                user.onboardingComplete = true; // Assuming backend sends this back or we update it client-side
                localStorage.setItem('user', JSON.stringify(user));
            }
            navigate('/participant-dashboard'); // Redirect to participant dashboard
        } catch (err) {
            setError('Failed to save preferences.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSkipOnboarding = async () => {
        setLoading(true);
        try {
            await onboardingService.saveOnboardingPreferences([]); // Save empty array for skipping
            // Update local storage user to reflect onboarding completion
            const user = authService.getCurrentUser();
            if (user) {
                user.onboardingComplete = true;
                localStorage.setItem('user', JSON.stringify(user));
            }
            navigate('/participant-dashboard'); // Redirect to participant dashboard
        } catch (err) {
            setError('Failed to skip onboarding.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div>Loading organizers...</div>;
    }

    if (error) {
        return <div style={{ color: 'red' }}>{error}</div>;
    }

    return (
        <div className="onboarding-container">
            <h2>Welcome to Onboarding!</h2>
            <p>Select the organizers you are interested in:</p>
            <div className="organizers-list">
                {organizers.length > 0 ? (
                    organizers.map((organizer) => (
                        <div key={organizer._id} className="organizer-item">
                            <input
                                type="checkbox"
                                id={organizer._id}
                                checked={selectedOrganizers.includes(organizer._id)}
                                onChange={() => handleCheckboxChange(organizer._id)}
                            />
                            <label htmlFor={organizer._id}>
                                {organizer.firstName} {organizer.lastName} ({organizer.category})
                                {organizer.description && ` - ${organizer.description}`}
                            </label>
                        </div>
                    ))
                ) : (
                    <p>No organizers available at the moment.</p>
                )}
            </div>
            <div className="onboarding-actions">
                <button onClick={handleSavePreferences} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Preferences'}
                </button>
                <button onClick={handleSkipOnboarding} disabled={loading}>
                    {loading ? 'Skipping...' : 'Skip Onboarding'}
                </button>
            </div>
        </div>
    );
};

export default ParticipantOnboarding;