import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import onboardingService from '../services/onboardingService';
import authService from '../services/authService';

const INTEREST_OPTIONS = [
    { value: 'cultural', label: 'Cultural' },
    { value: 'technical', label: 'Technical' },
    { value: 'sports', label: 'Sports' },
    { value: 'others', label: 'Others' },
];

const ParticipantOnboarding = () => {
    const [organizers, setOrganizers] = useState([]);
    const [followedClubs, setFollowedClubs] = useState([]);
    const [selectedInterests, setSelectedInterests] = useState([]);
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

    const handleClubToggle = (organizerId) => {
        setFollowedClubs((prev) =>
            prev.includes(organizerId)
                ? prev.filter((id) => id !== organizerId)
                : [...prev, organizerId]
        );
    };

    const handleInterestToggle = (value) => {
        setSelectedInterests((prev) =>
            prev.includes(value)
                ? prev.filter((v) => v !== value)
                : [...prev, value]
        );
    };

    const handleSavePreferences = async () => {
        setLoading(true);
        setError(null);
        try {
            await onboardingService.saveOnboardingPreferences(followedClubs, selectedInterests);
            const user = authService.getCurrentUser();
            if (user) {
                user.onboardingComplete = true;
                localStorage.setItem('user', JSON.stringify(user));
            }
            navigate('/participant-dashboard');
        } catch (err) {
            setError('Failed to save preferences.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSkipOnboarding = async () => {
        setLoading(true);
        setError(null);
        try {
            await onboardingService.saveOnboardingPreferences([], []);
            const user = authService.getCurrentUser();
            if (user) {
                user.onboardingComplete = true;
                localStorage.setItem('user', JSON.stringify(user));
            }
            navigate('/participant-dashboard');
        } catch (err) {
            setError('Failed to skip onboarding.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading && organizers.length === 0) {
        return <div>Loading...</div>;
    }

    return (
        <div className="onboarding-container" style={{ maxWidth: '560px', margin: '2rem auto', padding: '0 1rem' }}>
            <h2>Welcome to Onboarding</h2>
            <p>Tell us your interests and which clubs you want to follow.</p>

            {/* Selected interests */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Your interests</h3>
                <p style={{ color: '#555', marginBottom: '0.75rem' }}>Select all that apply:</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                    {INTEREST_OPTIONS.map((opt) => (
                        <label key={opt.value} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={selectedInterests.includes(opt.value)}
                                onChange={() => handleInterestToggle(opt.value)}
                                style={{ marginRight: '0.5rem' }}
                            />
                            {opt.label}
                        </label>
                    ))}
                </div>
            </div>

            {/* Followed clubs - scrollable list */}
            <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Followed clubs</h3>
                <p style={{ color: '#555', marginBottom: '0.75rem' }}>Select clubs you want to follow:</p>
                <div
                    className="followed-clubs-list"
                    style={{
                        maxHeight: '220px',
                        overflowY: 'auto',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        padding: '0.5rem',
                        background: '#fafafa',
                    }}
                >
                    {organizers.length > 0 ? (
                        organizers.map((organizer) => (
                            <div
                                key={organizer._id}
                                style={{
                                    padding: '0.6rem',
                                    borderBottom: '1px solid #eee',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                }}
                            >
                                <input
                                    type="checkbox"
                                    id={`club-${organizer._id}`}
                                    checked={followedClubs.includes(organizer._id)}
                                    onChange={() => handleClubToggle(organizer._id)}
                                />
                                <label htmlFor={`club-${organizer._id}`} style={{ flex: 1, cursor: 'pointer', margin: 0 }}>
                                    <strong>{organizer.firstName} {organizer.lastName}</strong>
                                    {organizer.clubInterest && (
                                        <span style={{ marginLeft: '0.5rem', color: '#666', textTransform: 'capitalize' }}>
                                            ({organizer.clubInterest})
                                        </span>
                                    )}
                                    {organizer.description && (
                                        <span style={{ display: 'block', fontSize: '0.9em', color: '#555' }}>
                                            {organizer.description}
                                        </span>
                                    )}
                                </label>
                            </div>
                        ))
                    ) : (
                        <p style={{ padding: '0.5rem', margin: 0, color: '#666' }}>No clubs available at the moment.</p>
                    )}
                </div>
            </div>

            {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}

            <div className="onboarding-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                <button onClick={handleSavePreferences} disabled={loading}>
                    {loading ? 'Saving...' : 'Save preferences'}
                </button>
                <button onClick={handleSkipOnboarding} disabled={loading} style={{ background: '#eee', color: '#333' }}>
                    {loading ? 'Skipping...' : 'Skip'}
                </button>
            </div>
        </div>
    );
};

export default ParticipantOnboarding;
