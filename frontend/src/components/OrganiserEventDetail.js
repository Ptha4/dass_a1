import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import eventService from '../services/eventService';
import authService from '../services/authService';
import './OrganiserEventDetail.css';

const OrganiserEventDetail = () => {
    const { eventId } = useParams();
    const [event, setEvent] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterPayment, setFilterPayment] = useState('all');
    const [sortBy, setSortBy] = useState('regDate');
    const [sortOrder, setSortOrder] = useState('desc');
    
    const user = authService.getCurrentUser();
    const token = user?.token;

    // Fetch event details
    const fetchEventDetails = useCallback(async () => {
        if (!token || !eventId) return;
        try {
            const data = await eventService.getEventById(eventId, token);
            setEvent(data);
        } catch (err) {
            console.error('Error fetching event details:', err);
        }
    }, [token, eventId]);

    // Fetch event-specific analytics
    const fetchEventAnalytics = useCallback(async () => {
        if (!token || !eventId) return;
        try {
            const data = await eventService.getEventAnalytics(eventId, token);
            setAnalytics(data);
        } catch (err) {
            console.error('Error fetching event analytics:', err);
        }
    }, [token, eventId]);

    // Fetch participants
    const fetchParticipants = useCallback(async () => {
        if (!token || !eventId) return;
        try {
            const data = await eventService.getEventParticipants(eventId, token);
            setParticipants(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching participants:', err);
            setParticipants([]);
        }
    }, [token, eventId]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([
                fetchEventDetails(),
                fetchEventAnalytics(),
                fetchParticipants()
            ]);
            setLoading(false);
        };
        loadData();
    }, [fetchEventDetails, fetchEventAnalytics, fetchParticipants]);

    // Filter and sort participants
    const filteredParticipants = participants
        .filter(participant => {
            const matchesSearch = !searchTerm || 
                participant.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                participant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                participant.teamName?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = filterStatus === 'all' || participant.status === filterStatus;
            const matchesPayment = filterPayment === 'all' || participant.paymentStatus === filterPayment;
            
            return matchesSearch && matchesStatus && matchesPayment;
        })
        .sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case 'name':
                    aValue = a.name || '';
                    bValue = b.name || '';
                    break;
                case 'email':
                    aValue = a.email || '';
                    bValue = b.email || '';
                    break;
                case 'regDate':
                    aValue = new Date(a.registrationDate || 0);
                    bValue = new Date(b.registrationDate || 0);
                    break;
                case 'paymentStatus':
                    aValue = a.paymentStatus || '';
                    bValue = b.paymentStatus || '';
                    break;
                case 'attendance':
                    aValue = a.attendance ? 1 : 0;
                    bValue = b.attendance ? 1 : 0;
                    break;
                default:
                    aValue = a.registrationDate || '';
                    bValue = b.registrationDate || '';
            }
            
            if (sortOrder === 'asc') {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Name', 'Email', 'Registration Date', 'Payment Status', 'Team Name', 'Attendance', 'Ticket ID'];
        const csvData = filteredParticipants.map(participant => [
            participant.name || '',
            participant.email || '',
            new Date(participant.registrationDate).toLocaleDateString(),
            participant.paymentStatus || '',
            participant.teamName || '',
            participant.attendance ? 'Present' : 'Absent',
            participant.ticketId || ''
        ]);
        
        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event?.eventName || 'event'}_participants.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR'
        }).format(amount || 0);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="organiser-event-detail">
                <div className="loading-container">
                    <p>Loading event details...</p>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <div className="organiser-event-detail">
                <div className="error-state">
                    <p>Event not found</p>
                    <Link to="/organiser-dashboard" className="back-link">← Back to Dashboard</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="organiser-event-detail">
            <div className="event-detail-header">
                <Link to="/organiser-dashboard" className="back-link">← Back to Dashboard</Link>
                <h1>{event.eventName}</h1>
                <div className="event-meta">
                    <span className={`status-badge ${event.status}`}>{event.status}</span>
                    <span className="event-type">{event.eventType}</span>
                </div>
            </div>

            <div className="event-detail-tabs">
                <button
                    className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                <button
                    className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analytics')}
                >
                    Analytics
                </button>
                <button
                    className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`}
                    onClick={() => setActiveTab('participants')}
                >
                    Participants ({filteredParticipants.length})
                </button>
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="tab-content">
                    <div className="overview-grid">
                        <div className="overview-card">
                            <h3>Basic Information</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Event Name:</label>
                                    <span>{event.eventName}</span>
                                </div>
                                <div className="info-item">
                                    <label>Type:</label>
                                    <span>{event.eventType}</span>
                                </div>
                                <div className="info-item">
                                    <label>Status:</label>
                                    <span className={`status-badge ${event.status}`}>{event.status}</span>
                                </div>
                                <div className="info-item">
                                    <label>Eligibility:</label>
                                    <span>{event.eligibility || 'Open to all'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="overview-card">
                            <h3>Event Schedule</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Start Date:</label>
                                    <span>{formatDate(event.eventStartDate)}</span>
                                </div>
                                <div className="info-item">
                                    <label>End Date:</label>
                                    <span>{formatDate(event.eventEndDate)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Registration Deadline:</label>
                                    <span>{formatDate(event.registrationDeadline)}</span>
                                </div>
                                <div className="info-item">
                                    <label>Location:</label>
                                    <span>{event.location || 'TBD'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="overview-card">
                            <h3>Pricing</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>Registration Fee:</label>
                                    <span>{formatCurrency(event.registrationFee)}</span>
                                </div>
                                {event.eventType === 'merch' && (
                                    <>
                                        <div className="info-item">
                                            <label>Total Merchandise Revenue:</label>
                                            <span>{formatCurrency(analytics?.merchandiseRevenue || 0)}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Purchase Limit:</label>
                                            <span>{event.purchaseLimitPerParticipant || 'No limit'}</span>
                                        </div>
                                    </>
                                )}
                                <div className="info-item">
                                    <label>Total Revenue:</label>
                                    <span className="revenue-total">
                                        {formatCurrency(analytics?.totalRevenue || 0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="overview-card">
                            <h3>Description</h3>
                            <div className="description-content">
                                <p>{event.eventDescription || 'No description available'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div className="tab-content">
                    <div className="analytics-grid">
                        <div className="analytics-card">
                            <h3>Registration & Sales</h3>
                            <div className="analytics-stats">
                                <div className="stat-item">
                                    <label>Total Registrations:</label>
                                    <span className="stat-value">{analytics?.totalRegistrations || 0}</span>
                                </div>
                                <div className="stat-item">
                                    <label>Confirmed Registrations:</label>
                                    <span className="stat-value">{analytics?.confirmedRegistrations || 0}</span>
                                </div>
                                <div className="stat-item">
                                    <label>Pending Payments:</label>
                                    <span className="stat-value">{analytics?.pendingPayments || 0}</span>
                                </div>
                                <div className="stat-item">
                                    <label>Total Revenue:</label>
                                    <span className="stat-value revenue">{formatCurrency(analytics?.totalRevenue || 0)}</span>
                                </div>
                            </div>
                        </div>

                        <div className="analytics-card">
                            <h3>Attendance</h3>
                            <div className="analytics-stats">
                                <div className="stat-item">
                                    <label>Total Attended:</label>
                                    <span className="stat-value">{analytics?.totalAttended || 0}</span>
                                </div>
                                <div className="stat-item">
                                    <label>Attendance Rate:</label>
                                    <span className="stat-value">
                                        {analytics?.totalRegistrations > 0 
                                            ? Math.round((analytics?.totalAttended / analytics?.totalRegistrations) * 100)
                                            : 0}%
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <label>Team Completion:</label>
                                    <span className="stat-value">
                                        {analytics?.teamCompletionRate || 0}%
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <label>Average Team Size:</label>
                                    <span className="stat-value">{analytics?.averageTeamSize || 0}</span>
                                </div>
                            </div>
                        </div>

                        {event.eventType === 'merch' && (
                            <div className="analytics-card">
                                <h3>Merchandise Sales</h3>
                                <div className="analytics-stats">
                                    <div className="stat-item">
                                        <label>Items Sold:</label>
                                        <span className="stat-value">{analytics?.totalItemsSold || 0}</span>
                                    </div>
                                    <div className="stat-item">
                                        <label>Merchandise Revenue:</label>
                                        <span className="stat-value revenue">{formatCurrency(analytics?.merchandiseRevenue || 0)}</span>
                                    </div>
                                    <div className="stat-item">
                                        <label>Average Order Value:</label>
                                        <span className="stat-value">{formatCurrency(analytics?.averageOrderValue || 0)}</span>
                                    </div>
                                    <div className="stat-item">
                                        <label>Most Popular Item:</label>
                                        <span className="stat-value">{analytics?.mostPopularItem || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Participants Tab */}
            {activeTab === 'participants' && (
                <div className="tab-content">
                    <div className="participants-controls">
                        <div className="search-filters">
                            <input
                                type="text"
                                placeholder="Search by name, email, or team..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="search-input"
                            />
                            
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Status</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="pending">Pending</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                            
                            <select
                                value={filterPayment}
                                onChange={(e) => setFilterPayment(e.target.value)}
                                className="filter-select"
                            >
                                <option value="all">All Payment</option>
                                <option value="paid">Paid</option>
                                <option value="pending">Pending</option>
                                <option value="unpaid">Unpaid</option>
                            </select>
                            
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="filter-select"
                            >
                                <option value="regDate">Registration Date</option>
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                                <option value="paymentStatus">Payment Status</option>
                                <option value="attendance">Attendance</option>
                            </select>
                            
                            <button
                                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                className="sort-toggle"
                            >
                                {sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                        
                        <button onClick={exportToCSV} className="export-btn">
                            Export CSV
                        </button>
                    </div>

                    <div className="participants-table-container">
                        <table className="participants-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Registration Date</th>
                                    <th>Payment Status</th>
                                    <th>Team</th>
                                    <th>Attendance</th>
                                    <th>Ticket ID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredParticipants.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="no-data">
                                            No participants found matching your criteria
                                        </td>
                                    </tr>
                                ) : (
                                    filteredParticipants.map((participant) => (
                                        <tr key={participant._id}>
                                            <td>{participant.name || 'N/A'}</td>
                                            <td>{participant.email || 'N/A'}</td>
                                            <td>{formatDate(participant.registrationDate)}</td>
                                            <td>
                                                <span className={`payment-badge ${participant.paymentStatus || 'unpaid'}`}>
                                                    {participant.paymentStatus || 'Unpaid'}
                                                </span>
                                            </td>
                                            <td>{participant.teamName || 'Individual'}</td>
                                            <td>
                                                <span className={`attendance-badge ${participant.attendance ? 'present' : 'absent'}`}>
                                                    {participant.attendance ? '✓ Present' : '✗ Absent'}
                                                </span>
                                            </td>
                                            <td className="ticket-id">{participant.ticketId || 'N/A'}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrganiserEventDetail;
