import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authService from '../services/authService';
import onboardingService from '../services/onboardingService';
import passwordResetService from '../services/passwordResetService';

const INTEREST_OPTIONS = [
    { value: 'cultural', label: 'Cultural' },
    { value: 'technical', label: 'Technical' },
    { value: 'sports', label: 'Sports' },
    { value: 'others', label: 'Others' },
];

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [profileSuccess, setProfileSuccess] = useState(null);

    // Editable fields (participants)
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [collegeOrOrgName, setCollegeOrOrgName] = useState('');
    const [selectedInterests, setSelectedInterests] = useState([]);
    const [followedClubs, setFollowedClubs] = useState([]);

    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState(null);
    const [changingPassword, setChangingPassword] = useState(false);

    // Organizer password reset request
    const [resetClubName, setResetClubName] = useState('');
    const [resetReason, setResetReason] = useState('');
    const [resetSubmitting, setResetSubmitting] = useState(false);
    const [resetError, setResetError] = useState(null);
    const [resetSuccess, setResetSuccess] = useState(null);
    const [myResetRequests, setMyResetRequests] = useState([]);
    const [resetRequestsLoading, setResetRequestsLoading] = useState(false);

    const user = authService.getCurrentUser();
    const token = user?.token;
    const isParticipant = user && !user.isOrganiser && !user.isAdmin;

    useEffect(() => {
        const load = async () => {
            if (!token) {
                setLoading(false);
                return;
            }
            try {
                const [userData, orgsRes] = await Promise.all([
                    authService.getProfile(token),
                    onboardingService.getOrganizers().catch(() => ({ data: [] })),
                ]);
                setProfile(userData);
                setOrganizers(orgsRes.data || []);
                setFirstName(userData.firstName || '');
                setLastName(userData.lastName || '');
                setContactNumber(userData.contactNumber || '');
                setCollegeOrOrgName(userData.collegeOrOrgName || '');
                setSelectedInterests(Array.isArray(userData.selectedInterests) ? userData.selectedInterests : []);
                setFollowedClubs(Array.isArray(userData.followedClubs) ? userData.followedClubs.map(id => id.toString ? id.toString() : id) : []);
            } catch (err) {
                setProfileError(err.response?.data?.msg || err.message || 'Failed to load profile.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [token]);

    const loadMyResetRequests = () => {
        if (!user?.isOrganiser || !token) return;
        setResetRequestsLoading(true);
        passwordResetService
            .getMyPasswordResetRequests()
            .then((data) => setMyResetRequests(data.requests || []))
            .catch(() => setMyResetRequests([]))
            .finally(() => setResetRequestsLoading(false));
    };

    useEffect(() => {
        if (user?.isOrganiser) loadMyResetRequests();
    }, [user?.isOrganiser, token]);

    const handlePasswordResetRequest = async (e) => {
        e.preventDefault();
        setResetError(null);
        setResetSuccess(null);
        if (!resetClubName.trim() || !resetReason.trim()) {
            setResetError('Club name and reason are required.');
            return;
        }
        if (resetReason.trim().length < 10) {
            setResetError('Reason must be at least 10 characters long.');
            return;
        }
        setResetSubmitting(true);
        try {
            await passwordResetService.submitPasswordResetRequest({
                clubName: resetClubName.trim(),
                reason: resetReason.trim(),
            });
            setResetSuccess('Password reset request submitted. Please wait for admin approval.');
            setResetClubName('');
            setResetReason('');
            loadMyResetRequests();
        } catch (err) {
            setResetError(err.response?.data?.message || err.message || 'Failed to submit request.');
        } finally {
            setResetSubmitting(false);
        }
    };

    const handleInterestToggle = (value) => {
        setSelectedInterests((prev) =>
            prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
        );
    };

    const handleClubToggle = (organizerId) => {
        const id = organizerId.toString ? organizerId.toString() : organizerId;
        setFollowedClubs((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!token) return;
        setSaving(true);
        setProfileError(null);
        setProfileSuccess(null);
        try {
            const updated = await authService.updateProfile(
                { firstName, lastName, contactNumber, collegeOrOrgName, selectedInterests, followedClubs },
                token
            );
            setProfile(updated);
            setProfileSuccess('Profile updated successfully.');
        } catch (err) {
            setProfileError(err.response?.data?.msg || err.message || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setPasswordError(null);
        setPasswordSuccess(null);
        if (newPassword !== confirmPassword) {
            setPasswordError('New password and confirmation do not match.');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('New password must be at least 6 characters.');
            return;
        }
        if (!token) return;
        setChangingPassword(true);
        try {
            await authService.changePassword(currentPassword, newPassword, token);
            setPasswordSuccess('Password changed successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPasswordError(err.response?.data?.msg || err.message || 'Failed to change password.');
        } finally {
            setChangingPassword(false);
        }
    };

    if (!user) {
        return (
            <div className="profile-container" style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Please <Link to="/login">log in</Link> to view your profile.</p>
            </div>
        );
    }

    if (loading) {
        return <div className="profile-container" style={{ padding: '2rem' }}>Loading profile...</div>;
    }

    const containerStyle = { maxWidth: '600px', margin: '2rem auto', padding: '1.5rem', border: '1px solid #eee', borderRadius: '8px' };

    return (
        <div className="profile-container" style={containerStyle}>
            <h1>Profile</h1>

            {/* Non-editable */}
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
                <p><strong>Email address</strong> <span style={{ color: '#666' }}>(cannot be changed)</span></p>
                <p style={{ margin: 0 }}>{profile?.email || user.email}</p>
                {profile?.participantType != null && (
                    <>
                        <p style={{ marginTop: '1rem' }}><strong>Participant type</strong> <span style={{ color: '#666' }}>(cannot be changed)</span></p>
                        <p style={{ margin: 0 }}>{profile.participantType}</p>
                    </>
                )}
            </div>

            {/* Editable fields (participants) */}
            {isParticipant && (
                <form onSubmit={handleSaveProfile} style={{ marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Edit profile</h2>
                    {profileError && <p style={{ color: '#c00', marginBottom: '0.5rem' }}>{profileError}</p>}
                    {profileSuccess && <p style={{ color: 'green', marginBottom: '0.5rem' }}>{profileSuccess}</p>}

                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>First name</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>Last name</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>Contact number</label>
                        <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>College / organization name</label>
                        <input type="text" value={collegeOrOrgName} onChange={(e) => setCollegeOrOrgName(e.target.value)} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
                    </div>

                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>Selected interests</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
                            {INTEREST_OPTIONS.map((opt) => (
                                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={selectedInterests.includes(opt.value)} onChange={() => handleInterestToggle(opt.value)} style={{ marginRight: '0.5rem' }} />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                        <label>Followed clubs</label>
                        <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '6px', padding: '0.5rem', marginTop: '0.25rem', background: '#fafafa' }}>
                            {organizers.length === 0 ? (
                                <p style={{ margin: 0, color: '#666' }}>No clubs available.</p>
                            ) : (
                                organizers.map((org) => {
                                    const id = (org._id || org.id).toString();
                                    return (
                                        <label key={id} style={{ display: 'flex', alignItems: 'center', padding: '0.4rem', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={followedClubs.includes(id)} onChange={() => handleClubToggle(id)} style={{ marginRight: '0.5rem' }} />
                                            {org.firstName} {org.lastName}
                                            {org.clubInterest && <span style={{ marginLeft: '0.5rem', color: '#666', textTransform: 'capitalize' }}>({org.clubInterest})</span>}
                                        </label>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save profile'}</button>
                </form>
            )}

            {/* Non-participant: show basic editable fields if we want; for now just links */}
            {!isParticipant && profile && (
                <div style={{ marginBottom: '1.5rem' }}>
                    {(profile.firstName || profile.lastName) && (
                        <p><strong>Name:</strong> {[profile.firstName, profile.lastName].filter(Boolean).join(' ')}</p>
                    )}
                </div>
            )}

            {/* Organizer: Request password reset from Admin */}
            {user.isOrganiser && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Password reset (organizers)</h2>
                    <p style={{ color: '#555', fontSize: '14px', marginBottom: '1rem' }}>Request a password reset from the Admin. You can have only one pending request at a time.</p>
                    {resetError && <p style={{ color: '#c00', marginBottom: '0.5rem' }}>{resetError}</p>}
                    {resetSuccess && <p style={{ color: 'green', marginBottom: '0.5rem' }}>{resetSuccess}</p>}
                    <form onSubmit={handlePasswordResetRequest}>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <label>Club name</label>
                            <input
                                type="text"
                                value={resetClubName}
                                onChange={(e) => setResetClubName(e.target.value)}
                                placeholder="e.g. Tech Club"
                                style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                            />
                        </div>
                        <div style={{ marginBottom: '0.75rem' }}>
                            <label>Reason (min 10 characters)</label>
                            <textarea
                                value={resetReason}
                                onChange={(e) => setResetReason(e.target.value)}
                                placeholder="Explain why you need a password reset"
                                rows={3}
                                style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
                            />
                        </div>
                        <button type="submit" disabled={resetSubmitting}>{resetSubmitting ? 'Submitting...' : 'Submit request'}</button>
                    </form>
                    <h3 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem' }}>My password reset requests</h3>
                    {resetRequestsLoading ? (
                        <p style={{ color: '#666' }}>Loading…</p>
                    ) : myResetRequests.length === 0 ? (
                        <p style={{ color: '#666' }}>No requests yet.</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                            {myResetRequests.map((req) => (
                                <li key={req.id} style={{ padding: '0.75rem', border: '1px solid #eee', borderRadius: '6px', marginBottom: '0.5rem', background: '#fafafa' }}>
                                    <strong>{req.clubName}</strong>
                                    <span style={{ marginLeft: '0.5rem', padding: '2px 8px', borderRadius: '4px', fontSize: '12px', textTransform: 'capitalize', background: req.status === 'pending' ? '#fff3cd' : req.status === 'approved' ? '#d4edda' : '#f8d7da', color: req.status === 'pending' ? '#856404' : req.status === 'approved' ? '#155724' : '#721c24' }}>
                                        {req.status}
                                    </span>
                                    <p style={{ margin: '0.25rem 0 0', fontSize: '14px', color: '#555' }}>{new Date(req.dateOfRequest).toLocaleString()}</p>
                                    {req.adminComments && <p style={{ margin: '0.25rem 0 0', fontSize: '13px', color: '#666' }}>Admin: {req.adminComments}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {/* Security: Change password */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: '1.5rem' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>Security – Change password</h2>
                {passwordError && <p style={{ color: '#c00', marginBottom: '0.5rem' }}>{passwordError}</p>}
                {passwordSuccess && <p style={{ color: 'green', marginBottom: '0.5rem' }}>{passwordSuccess}</p>}
                <form onSubmit={handleChangePassword}>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>Current password</label>
                        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>New password (min 6 characters)</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
                    </div>
                    <div style={{ marginBottom: '0.75rem' }}>
                        <label>Confirm new password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required style={{ display: 'block', width: '100%', padding: '0.5rem', marginTop: '0.25rem' }} />
                    </div>
                    <button type="submit" disabled={changingPassword}>{changingPassword ? 'Changing...' : 'Change password'}</button>
                </form>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
                <Link to="/participant-dashboard" style={{ marginRight: '1rem' }}>My tickets</Link>
                {user.isOrganiser && <Link to="/organiser-dashboard">Organiser dashboard</Link>}
            </div>
        </div>
    );
};

export default Profile;
