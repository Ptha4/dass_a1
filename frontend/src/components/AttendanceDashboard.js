import React, { useState, useEffect, useCallback } from 'react';
import eventService from '../services/eventService';
import authService from '../services/authService';
import './AttendanceDashboard.css';

const AttendanceDashboard = ({ eventId }) => {
    const [attendanceData, setAttendanceData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        scanned: 0,
        manual: 0,
        rejected: 0
    });

    const token = authService.getCurrentUser()?.token;

    const fetchAttendanceData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            
            const response = await eventService.getEventAttendance(eventId, token);
            
            setAttendanceData(response.attendance);
            
            // Calculate stats
            const total = response.attendance.length;
            const scanned = response.attendance.filter(att => att.status === 'scanned').length;
            const manual = response.attendance.filter(att => att.status === 'manual').length;
            const rejected = response.attendance.filter(att => att.status === 'rejected').length;
            
            setStats({ total, scanned, manual, rejected });

        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to load attendance data');
        } finally {
            setLoading(false);
        }
    }, [eventId, token]);

    useEffect(() => {
        if (eventId) {
            fetchAttendanceData();
        }
    }, [eventId, fetchAttendanceData]);

    const handleManualOverride = useCallback(async (registrationId, action, reason) => {
        try {
            setError('');
            
            await eventService.manualOverride(registrationId, action, reason, token);
            
            // Refresh data
            await fetchAttendanceData();

        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to process manual override');
        }
    }, [token, fetchAttendanceData]);

    const handleExportCSV = useCallback(() => {
        try {
            window.open(`http://localhost:5000/api/attendance/${eventId}/export`, '_blank');
        } catch (err) {
            setError('Failed to export CSV');
        }
    }, [eventId]);

    const getStatusBadge = (status) => {
        const statusConfig = {
            scanned: { class: 'badge-scanned', text: 'Scanned' },
            manual: { class: 'badge-manual', text: 'Manual' },
            rejected: { class: 'badge-rejected', text: 'Rejected' },
            not_scanned: { class: 'badge-pending', text: 'Not Scanned' }
        };
        
        return statusConfig[status] || statusConfig.not_scanned;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    if (loading) {
        return (
            <div className="attendance-dashboard">
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading attendance data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="attendance-dashboard">
                <div className="error-state">
                    <p>{error}</p>
                    <button onClick={() => setError('')} className="close-btn">×</button>
                </div>
            </div>
        );
    }

    return (
        <div className="attendance-dashboard">
            <div className="dashboard-header">
                <h3>Attendance Management</h3>
                <div className="export-section">
                    <button 
                        onClick={handleExportCSV}
                        className="btn btn-export"
                    >
                        📊 Export CSV
                    </button>
                </div>
            </div>

            <div className="stats-summary">
                <div className="stat-card">
                    <h4>Total Registrations</h4>
                    <div className="stat-number">{stats.total}</div>
                </div>
                <div className="stat-card">
                    <h4>Scanned</h4>
                    <div className="stat-number scanned">{stats.scanned}</div>
                </div>
                <div className="stat-card">
                    <h4>Manual</h4>
                    <div className="stat-number manual">{stats.manual}</div>
                </div>
                <div className="stat-card">
                    <h4>Rejected</h4>
                    <div className="stat-number rejected">{stats.rejected}</div>
                </div>
            </div>

            <div className="attendance-table-container">
                <h4>Participant Attendance</h4>
                <div className="table-responsive">
                    <table className="attendance-table">
                        <thead>
                            <tr>
                                <th>Participant</th>
                                <th>Ticket ID</th>
                                <th>Status</th>
                                <th>Scanned At</th>
                                <th>Scanned By</th>
                                <th>Scan Method</th>
                                <th>Notes</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendanceData.map((record, index) => (
                                <tr key={record._id} className={record.scanned ? 'scanned-row' : 'pending-row'}>
                                    <td>
                                        <div className="participant-info">
                                            <strong>{record.participant?.firstName} {record.participant?.lastName}</strong>
                                            <br />
                                            <small>{record.participant?.email}</small>
                                        </div>
                                    </td>
                                    <td>
                                        <code>{record.ticketId || 'N/A'}</code>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getStatusBadge(record.status).class}`}>
                                            {getStatusBadge(record.status).text}
                                        </span>
                                    </td>
                                    <td>
                                        {formatDate(record.scannedAt)}
                                    </td>
                                    <td>
                                        {record.scannedBy ? 
                                            `${record.scannedBy.firstName} ${record.scannedBy.lastName}` 
                                            : 'N/A'
                                        }
                                    </td>
                                    <td>
                                        <span className="scan-method">
                                            {record.scanMethod === 'camera' ? '📷 Camera' : 
                                             record.scanMethod === 'file_upload' ? '📁 File' : 
                                             record.scanMethod === 'manual_override' ? '✏️ Manual' : 'N/A'}
                                        </span>
                                    </td>
                                    <td>
                                        <small>{record.notes || record.manualOverrideReason || record.rejectionReason || '-'}</small>
                                    </td>
                                    <td>
                                        {!record.scanned && (
                                            <div className="action-buttons">
                                                <button
                                                    onClick={() => handleManualOverride(record.registrationId, 'mark', 'Mark as scanned')}
                                                    className="btn btn-small btn-success"
                                                >
                                                    ✓ Mark
                                                </button>
                                                <button
                                                    onClick={() => handleManualOverride(record.registrationId, 'reject', 'Reject entry')}
                                                    className="btn btn-small btn-danger"
                                                >
                                                    ✗ Reject
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendanceDashboard;
