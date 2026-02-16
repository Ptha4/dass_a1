import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';

const API_URL = 'http://localhost:5000/api';

const ClubsOrganizers = () => {
    const [organizers, setOrganizers] = useState([]);
    const [followedIds, setFollowedIds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [togglingId, setTogglingId] = useState(null);

    const user = authService.getCurrentUser();
    const token = user?.token;
    const isParticipant = user && !user.isOrganiser && !user.isAdmin;

    useEffect(() => {
        const fetchOrganizers = async () => {
            try {
                const res = await fetch(`${API_URL}/organizers`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || data.msg || 'Failed to load organizers');
                setOrganizers(data);
            } catch (err) {
                setError(err.message || 'Failed to load clubs.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrganizers();
    }, []);

    useEffect(() => {
        if (!token || !isParticipant) return;
        const loadFollowed = async () => {
            try {
                const profile = await authService.getProfile(token);
                const ids = (profile.followedClubs || []).map((id) => (id && id.toString ? id.toString() : id));
                setFollowedIds(ids);
            } catch (e) {
                // ignore
            }
        };
        loadFollowed();
    }, [token, isParticipant]);

    const isFollowing = (orgId) => followedIds.includes((orgId || '').toString());

    const handleFollowToggle = async (organizerId) => {
        if (!token || !isParticipant) return;
        setTogglingId(organizerId);
        try {
            const idStr = organizerId.toString();
            const next = isFollowing(organizerId)
                ? followedIds.filter((x) => x !== idStr)
                : [...followedIds, idStr];
            await authService.updateProfile({ followedClubs: next }, token);
            setFollowedIds(next);
        } catch (err) {
            console.error(err);
        } finally {
            setTogglingId(null);
        }
    };

    if (loading) return <div className="clubs-organizers-container" style={{ padding: '2rem' }}>Loading...</div>;
    if (error) return <div className="clubs-organizers-container" style={{ padding: '2rem', color: '#c00' }}>{error}</div>;

    return (
        <div className="clubs-organizers-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
            <h1>All clubs</h1>
            <p style={{ color: '#555', marginBottom: '1rem' }}>Approved organizers. {isParticipant && 'Follow clubs to see their events in Browse Events.'}</p>
            {organizers.length === 0 ? (
                <p>No organizers listed yet.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {organizers.map((org) => {
                        const id = org._id || org.id;
                        const following = isFollowing(id);
                        return (
                            <li key={id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <Link to={`/clubs/${id}`} style={{ fontWeight: 'bold', textDecoration: 'none' }}>
                                        {org.firstName} {org.lastName}
                                    </Link>
                                    {org.clubInterest && (
                                        <span style={{ marginLeft: '0.5rem', fontSize: '0.9em', color: '#666', textTransform: 'capitalize' }}>— {org.clubInterest}</span>
                                    )}
                                    {org.category && <p style={{ margin: '0.25rem 0', color: '#555' }}><strong>Category:</strong> {org.category}</p>}
                                    {org.description && <p style={{ margin: 0 }}>{org.description}</p>}
                                </div>
                                <div style={{ flexShrink: 0 }}>
                                    <Link to={`/clubs/${id}`} style={{ marginRight: '0.5rem' }}>View</Link>
                                    {isParticipant && (
                                        <button
                                            type="button"
                                            onClick={() => handleFollowToggle(id)}
                                            disabled={togglingId === id}
                                        >
                                            {togglingId === id ? '...' : following ? 'Unfollow' : 'Follow'}
                                        </button>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            <Link to="/events">Browse events</Link>
        </div>
    );
};

export default ClubsOrganizers;
