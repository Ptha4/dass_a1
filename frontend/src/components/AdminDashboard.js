import React, { useState, useEffect } from 'react';
import adminService from '../services/adminService';
import './AdminDashboard.css';

const CLUB_INTERESTS = ['cultural', 'technical', 'sports', 'others'];

const AdminDashboard = () => {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [credentials, setCredentials] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    const [form, setForm] = useState({
        firstName: '',
        lastName: '',
        category: '',
        description: '',
        clubInterest: 'others',
    });

    const loadOrganizers = () => {
        setLoading(true);
        adminService
            .getAdminOrganizers()
            .then((data) => {
                setOrganizers(Array.isArray(data) ? data : []);
                setError('');
            })
            .catch((err) => {
                setError(err.response?.data?.msg || err.message || 'Failed to load organizers');
                setOrganizers([]);
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadOrganizers();
    }, []);

    const handleAddSubmit = (e) => {
        e.preventDefault();
        setError('');
        adminService
            .createOrganizer(form)
            .then((data) => {
                setCredentials(data.credentials || { email: data.organizer?.email, password: data.password });
                setShowAddForm(false);
                setForm({ firstName: '', lastName: '', category: '', description: '', clubInterest: 'others' });
                loadOrganizers();
            })
            .catch((err) => {
                setError(err.response?.data?.msg || err.message || 'Failed to create organizer');
            });
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
    };

    const handleDisable = (org) => {
        const newDisabled = !org.disabled;
        adminService
            .updateOrganizerStatus(org._id, { disabled: newDisabled })
            .then(() => loadOrganizers())
            .catch((err) => setError(err.response?.data?.msg || err.message));
    };

    const handleArchive = (org) => {
        const newArchived = !org.archived;
        adminService
            .updateOrganizerStatus(org._id, { archived: newArchived })
            .then(() => loadOrganizers())
            .catch((err) => setError(err.response?.data?.msg || err.message));
    };

    const handleDeleteClick = (org) => {
        setDeleteConfirm(org);
    };

    const handleDeleteConfirm = () => {
        if (!deleteConfirm) return;
        adminService
            .deleteOrganizer(deleteConfirm._id)
            .then(() => {
                setDeleteConfirm(null);
                loadOrganizers();
            })
            .catch((err) => {
                setError(err.response?.data?.msg || err.message);
            });
    };

    const statusLabel = (org) => {
        if (org.archived) return 'Archived';
        if (org.disabled) return 'Disabled';
        return 'Active';
    };

    return (
        <div className="admin-dashboard">
            <h2>Admin Dashboard</h2>
            <p className="admin-subtitle">Club/Organizer Management</p>

            {error && (
                <div className="admin-error" role="alert">
                    {error}
                </div>
            )}

            <section className="admin-section">
                <h3>Add New Club/Organizer</h3>
                <p className="section-desc">Create a new club or organizer account. The system will auto-generate login email and password. Share the credentials with the club/organizer; they can log in immediately.</p>
                {!showAddForm ? (
                    <button type="button" className="btn-primary" onClick={() => setShowAddForm(true)}>
                        Add New Club/Organizer
                    </button>
                ) : (
                    <form className="admin-organizer-form" onSubmit={handleAddSubmit}>
                        <label>
                            First name (display)
                            <input
                                type="text"
                                value={form.firstName}
                                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                                placeholder="e.g. Tech"
                            />
                        </label>
                        <label>
                            Last name (display)
                            <input
                                type="text"
                                value={form.lastName}
                                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                                placeholder="Club"
                            />
                        </label>
                        <label>
                            Category
                            <input
                                type="text"
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                placeholder="e.g. Technical"
                            />
                        </label>
                        <label>
                            Description
                            <textarea
                                value={form.description}
                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                placeholder="Short description"
                                rows={2}
                            />
                        </label>
                        <label>
                            Club interest
                            <select
                                value={form.clubInterest}
                                onChange={(e) => setForm({ ...form, clubInterest: e.target.value })}
                            >
                                {CLUB_INTERESTS.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </label>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary">Create account</button>
                            <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
                        </div>
                    </form>
                )}
            </section>

            {credentials && (
                <div className="credentials-modal" role="dialog" aria-labelledby="credentials-title">
                    <div className="credentials-box">
                        <h3 id="credentials-title">Credentials – share with club/organizer</h3>
                        <p className="credentials-msg">{credentials.message || 'Share these credentials. They can log in immediately.'}</p>
                        <div className="credentials-row">
                            <strong>Email:</strong>
                            <code>{credentials.email}</code>
                            <button type="button" className="btn-copy" onClick={() => copyToClipboard(credentials.email)}>Copy</button>
                        </div>
                        <div className="credentials-row">
                            <strong>Password:</strong>
                            <code>{credentials.password}</code>
                            <button type="button" className="btn-copy" onClick={() => copyToClipboard(credentials.password)}>Copy</button>
                        </div>
                        <button type="button" className="btn-primary" onClick={() => setCredentials(null)}>Done</button>
                    </div>
                </div>
            )}

            <section className="admin-section">
                <h3>All Clubs/Organizers</h3>
                <p className="section-desc">View, disable, archive, or permanently delete club/organizer accounts. Disabled and archived accounts cannot log in.</p>
                {loading ? (
                    <p>Loading…</p>
                ) : organizers.length === 0 ? (
                    <p>No clubs/organizers yet.</p>
                ) : (
                    <div className="organizers-table-wrap">
                        <table className="organizers-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Category</th>
                                    <th>Club interest</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {organizers.map((org) => (
                                    <tr key={org._id}>
                                        <td>{[org.firstName, org.lastName].filter(Boolean).join(' ') || '—'}</td>
                                        <td>{org.email}</td>
                                        <td>{org.category || '—'}</td>
                                        <td>{org.clubInterest || '—'}</td>
                                        <td><span className={`status-badge status-${statusLabel(org).toLowerCase()}`}>{statusLabel(org)}</span></td>
                                        <td className="actions-cell">
                                            <button
                                                type="button"
                                                className="btn-sm"
                                                onClick={() => handleDisable(org)}
                                                title={org.disabled ? 'Enable' : 'Disable'}
                                            >
                                                {org.disabled ? 'Enable' : 'Disable'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-sm"
                                                onClick={() => handleArchive(org)}
                                                title={org.archived ? 'Unarchive' : 'Archive'}
                                            >
                                                {org.archived ? 'Unarchive' : 'Archive'}
                                            </button>
                                            <button
                                                type="button"
                                                className="btn-sm btn-danger"
                                                onClick={() => handleDeleteClick(org)}
                                                title="Permanently delete"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {deleteConfirm && (
                <div className="credentials-modal" role="dialog" aria-labelledby="delete-title">
                    <div className="credentials-box delete-confirm">
                        <h3 id="delete-title">Permanently delete organizer?</h3>
                        <p>This will remove &quot;{[deleteConfirm.firstName, deleteConfirm.lastName].filter(Boolean).join(' ') || deleteConfirm.email}&quot;. This action cannot be undone.</p>
                        <div className="form-actions">
                            <button type="button" className="btn-danger" onClick={handleDeleteConfirm}>Delete permanently</button>
                            <button type="button" className="btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
