import React, { useState, useEffect } from 'react';
import adminService from '../services/adminService';
import passwordResetService from '../services/passwordResetService';
import './AdminDashboard.css';

const CLUB_INTERESTS = ['cultural', 'technical', 'sports', 'others'];

const AdminDashboard = () => {
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [credentials, setCredentials] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState(null);

    // Password reset requests (admin)
    const [resetRequests, setResetRequests] = useState([]);
    const [resetPagination, setResetPagination] = useState(null);
    const [resetStatusFilter, setResetStatusFilter] = useState(''); // '' | 'pending' | 'approved' | 'rejected'
    const [resetLoading, setResetLoading] = useState(false);
    const [processModal, setProcessModal] = useState(null); // { request, approved, adminComments }
    const [processSubmitting, setProcessSubmitting] = useState(false);
    const [newPasswordModal, setNewPasswordModal] = useState(null); // { organizerName, clubName, newPassword }
    const [historyOrganizer, setHistoryOrganizer] = useState(null); // { organizerId, organizerName } -> show history
    const [resetHistory, setResetHistory] = useState(null);

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

    const loadResetRequests = (status = resetStatusFilter, page = 1) => {
        setResetLoading(true);
        passwordResetService
            .getAllPasswordResetRequests({ status: status || undefined, page, limit: 20 })
            .then((data) => {
                setResetRequests(data.requests || []);
                setResetPagination(data.pagination || null);
            })
            .catch((err) => {
                setError(err.response?.data?.message || err.message || 'Failed to load password reset requests');
                setResetRequests([]);
            })
            .finally(() => setResetLoading(false));
    };

    useEffect(() => {
        loadResetRequests();
    }, [resetStatusFilter]);

    const openProcessModal = (request, approved) => {
        setProcessModal({ request, approved, adminComments: '' });
    };

    const handleProcessSubmit = () => {
        if (!processModal) return;
        setProcessSubmitting(true);
        passwordResetService
            .processPasswordResetRequest(processModal.request._id, {
                approved: processModal.approved,
                adminComments: processModal.adminComments || undefined,
            })
            .then((data) => {
                setProcessModal(null);
                loadResetRequests();
                if (processModal.approved && data.request?.newPassword) {
                    setNewPasswordModal({
                        organizerName: data.request.organizerName,
                        clubName: data.request.clubName,
                        newPassword: data.request.newPassword,
                    });
                }
            })
            .catch((err) => setError(err.response?.data?.message || err.message || 'Failed to process request'))
            .finally(() => setProcessSubmitting(false));
    };

    const loadOrganizerHistory = (organizerId) => {
        passwordResetService
            .getOrganizerResetHistory(organizerId)
            .then((data) => setResetHistory(data))
            .catch((err) => setError(err.response?.data?.message || err.message || 'Failed to load history'));
    };

    const openHistory = (req) => {
        const organizerId = req.organizerId?._id || req.organizerId;
        const name = req.organizerId ? [req.organizerId.firstName, req.organizerId.lastName].filter(Boolean).join(' ') : 'Organizer';
        setHistoryOrganizer({ organizerId, organizerName: name });
        loadOrganizerHistory(organizerId);
    };

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

            {/* Password reset requests (admin) */}
            <section className="admin-section">
                <h3>Password reset requests</h3>
                <p className="section-desc">Organizers request password resets here. View details, approve or reject with comments. On approval, a new password is generated for you to share with the organizer.</p>
                <div className="form-actions" style={{ marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>Status:</span>
                        <select
                            value={resetStatusFilter}
                            onChange={(e) => setResetStatusFilter(e.target.value)}
                            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #ccc' }}
                        >
                            <option value="">All</option>
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </label>
                </div>
                {resetLoading ? (
                    <p>Loading…</p>
                ) : resetRequests.length === 0 ? (
                    <p>No password reset requests.</p>
                ) : (
                    <div className="organizers-table-wrap">
                        <table className="organizers-table">
                            <thead>
                                <tr>
                                    <th>Club name</th>
                                    <th>Organizer</th>
                                    <th>Date</th>
                                    <th>Reason</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {resetRequests.map((req) => {
                                    const org = req.organizerId;
                                    const name = org ? [org.firstName, org.lastName].filter(Boolean).join(' ') : '—';
                                    return (
                                        <tr key={req._id}>
                                            <td>{req.clubName || '—'}</td>
                                            <td>{name}<br /><small style={{ color: '#666' }}>{org?.email}</small></td>
                                            <td>{req.dateOfRequest ? new Date(req.dateOfRequest).toLocaleString() : '—'}</td>
                                            <td style={{ maxWidth: 200 }}><span title={req.reason}>{req.reason ? (req.reason.length > 50 ? req.reason.slice(0, 50) + '…' : req.reason) : '—'}</span></td>
                                            <td>
                                                <span className={`status-badge status-${(req.status || '').toLowerCase()}`}>
                                                    {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : '—'}
                                                </span>
                                            </td>
                                            <td className="actions-cell">
                                                {req.status === 'pending' && (
                                                    <>
                                                        <button type="button" className="btn-sm" onClick={() => openProcessModal(req, true)}>Approve</button>
                                                        <button type="button" className="btn-sm btn-danger" onClick={() => openProcessModal(req, false)}>Reject</button>
                                                    </>
                                                )}
                                                <button type="button" className="btn-sm" onClick={() => openHistory(req)} title="View history">History</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
                {resetPagination && resetPagination.pages > 1 && (
                    <div className="form-actions" style={{ marginTop: 12 }}>
                        <button type="button" className="btn-secondary" disabled={resetPagination.page <= 1} onClick={() => loadResetRequests(resetStatusFilter, resetPagination.page - 1)}>Previous</button>
                        <span style={{ alignSelf: 'center' }}>Page {resetPagination.page} of {resetPagination.pages}</span>
                        <button type="button" className="btn-secondary" disabled={resetPagination.page >= resetPagination.pages} onClick={() => loadResetRequests(resetStatusFilter, resetPagination.page + 1)}>Next</button>
                    </div>
                )}
            </section>

            {/* Process modal (approve/reject with comments) */}
            {processModal && (
                <div className="credentials-modal" role="dialog" aria-labelledby="process-title">
                    <div className="credentials-box">
                        <h3 id="process-title">{processModal.approved ? 'Approve' : 'Reject'} password reset request</h3>
                        <p><strong>Club:</strong> {processModal.request.clubName}</p>
                        <p><strong>Organizer:</strong> {processModal.request.organizerId ? [processModal.request.organizerId.firstName, processModal.request.organizerId.lastName].filter(Boolean).join(' ') : '—'}</p>
                        <p><strong>Reason:</strong> {processModal.request.reason}</p>
                        <label style={{ display: 'block', marginTop: 12, marginBottom: 8 }}>
                            Admin comments (optional)
                            <textarea
                                value={processModal.adminComments}
                                onChange={(e) => setProcessModal({ ...processModal, adminComments: e.target.value })}
                                rows={3}
                                placeholder="e.g. Password shared via email."
                                style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, border: '1px solid #ccc', borderRadius: 4 }}
                            />
                        </label>
                        <div className="form-actions">
                            <button type="button" className={processModal.approved ? 'btn-primary' : 'btn-danger'} onClick={handleProcessSubmit} disabled={processSubmitting}>
                                {processSubmitting ? 'Processing...' : processModal.approved ? 'Approve & generate new password' : 'Reject'}
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => setProcessModal(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* New password modal (after approval) */}
            {newPasswordModal && (
                <div className="credentials-modal" role="dialog" aria-labelledby="new-password-title">
                    <div className="credentials-box">
                        <h3 id="new-password-title">New password – share with organizer</h3>
                        <p className="credentials-msg">Share this password with <strong>{newPasswordModal.organizerName}</strong> ({newPasswordModal.clubName}). They can log in with their existing email and this password.</p>
                        <div className="credentials-row">
                            <strong>New password:</strong>
                            <code>{newPasswordModal.newPassword}</code>
                            <button type="button" className="btn-copy" onClick={() => copyToClipboard(newPasswordModal.newPassword)}>Copy</button>
                        </div>
                        <button type="button" className="btn-primary" onClick={() => setNewPasswordModal(null)}>Done</button>
                    </div>
                </div>
            )}

            {/* Reset history modal */}
            {historyOrganizer && (
                <div className="credentials-modal" role="dialog" aria-labelledby="history-title">
                    <div className="credentials-box" style={{ maxWidth: 560, maxHeight: '80vh', overflow: 'auto' }}>
                        <h3 id="history-title">Password reset history – {historyOrganizer.organizerName}</h3>
                        {!resetHistory ? (
                            <p>Loading…</p>
                        ) : (
                            <div>
                                {resetHistory.resetHistory && resetHistory.resetHistory.length > 0 ? (
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                        {resetHistory.resetHistory.map((item, idx) => (
                                            <li key={idx} style={{ padding: '12px', border: '1px solid #eee', borderRadius: 6, marginBottom: 8, background: '#fafafa' }}>
                                                <strong>{item.clubName}</strong>
                                                <span style={{ marginLeft: 8, padding: '2px 6px', borderRadius: 4, fontSize: 12, textTransform: 'capitalize', background: item.status === 'approved' ? '#d4edda' : item.status === 'rejected' ? '#f8d7da' : '#fff3cd' }}>{item.status}</span>
                                                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#555' }}>{new Date(item.dateOfRequest).toLocaleString()}</p>
                                                <p style={{ margin: '4px 0 0', fontSize: 13 }}>{item.reason}</p>
                                                {item.adminComments && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>Admin: {item.adminComments}</p>}
                                                {item.processedAt && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#666' }}>Processed {new Date(item.processedAt).toLocaleString()}</p>}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p>No reset history for this organizer.</p>
                                )}
                            </div>
                        )}
                        <div className="form-actions" style={{ marginTop: 16 }}>
                            <button type="button" className="btn-secondary" onClick={() => { setHistoryOrganizer(null); setResetHistory(null); }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
