import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

const ClubsOrganizers = () => {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchOrganizers = async () => {
            try {
                const res = await fetch(`${API_URL}/organizers`);
                const data = await res.json();
                if (!res.ok) throw new Error(data.message || 'Failed to load organizers');
                setOrganizers(data);
            } catch (err) {
                setError(err.message || 'Failed to load clubs/organizers.');
            } finally {
                setLoading(false);
            }
        };
        fetchOrganizers();
    }, []);

    if (loading) return <div className="clubs-organizers-container" style={{ padding: '2rem' }}>Loading...</div>;
    if (error) return <div className="clubs-organizers-container" style={{ padding: '2rem', color: '#c00' }}>{error}</div>;

    return (
        <div className="clubs-organizers-container" style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
            <h1>Clubs / Organizers</h1>
            {organizers.length === 0 ? (
                <p>No organizers listed yet.</p>
            ) : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {organizers.map((org) => (
                        <li key={org._id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', marginBottom: '1rem' }}>
                            <strong>{org.firstName} {org.lastName}</strong>
                            {org.email && <p style={{ margin: '0.25rem 0', color: '#555' }}>{org.email}</p>}
                            {org.category && <p style={{ margin: 0 }}>Category: {org.category}</p>}
                            {org.description && <p style={{ margin: '0.25rem 0 0' }}>{org.description}</p>}
                        </li>
                    ))}
                </ul>
            )}
            <Link to="/events">Browse events</Link>
        </div>
    );
};

export default ClubsOrganizers;
