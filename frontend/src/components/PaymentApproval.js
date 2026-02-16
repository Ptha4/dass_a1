import React, { useState, useEffect, useCallback } from 'react';
import eventService from '../services/eventService';
import authService from '../services/authService';
import './PaymentApproval.css';

const PaymentApproval = () => {
    const [pendingApprovals, setPendingApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [rejectionModal, setRejectionModal] = useState(null);
    const [rejectionReason, setRejectionReason] = useState('');
    const [error, setError] = useState('');
    const token = authService.getCurrentUser()?.token;

    const fetchPendingApprovals = useCallback(async () => {
        if (!token) return;
        try {
            const data = await eventService.getPendingApprovals(token);
            setPendingApprovals(Array.isArray(data) ? data : []);
            setError('');
        } catch (err) {
            console.error('Error fetching pending approvals:', err);
            setError(err.response?.data?.message || 'Failed to load pending approvals');
            setPendingApprovals([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchPendingApprovals();
    }, [fetchPendingApprovals]);

    const handleApprove = async (registrationId) => {
        if (!token) return;
        setProcessingId(registrationId);
        try {
            await eventService.approvePayment(registrationId, true, '', token);
            await fetchPendingApprovals();
        } catch (err) {
            console.error('Error approving payment:', err);
            setError(err.response?.data?.message || 'Failed to approve payment');
        } finally {
            setProcessingId(null);
        }
    };

    const handleRejectClick = (registration) => {
        setRejectionModal(registration);
        setRejectionReason('');
    };

    const handleReject = async () => {
        if (!token || !rejectionModal) return;
        setProcessingId(rejectionModal._id);
        try {
            await eventService.approvePayment(rejectionModal._id, false, rejectionReason, token);
            setRejectionModal(null);
            setRejectionReason('');
            await fetchPendingApprovals();
        } catch (err) {
            console.error('Error rejecting payment:', err);
            setError(err.response?.data?.message || 'Failed to reject payment');
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 0
        }).format(amount || 0);
    };

    const calculateTotalCost = (purchasedItems) => {
        return purchasedItems.reduce((total, item) => {
            return total + (item.quantity * (item.price || 0));
        }, 0);
    };

    if (loading) {
        return (
            <div className="payment-approval">
                <div className="loading-container">
                    <p>Loading pending approvals...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-approval">
            <div className="payment-approval-header">
                <h3>Payment Approvals</h3>
                <p>Review and approve payment proofs for merchandise orders</p>
            </div>

            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')} className="close-btn">×</button>
                </div>
            )}

            {pendingApprovals.length === 0 ? (
                <div className="empty-state">
                    <p>No pending payment approvals</p>
                </div>
            ) : (
                <div className="approvals-list">
                    {pendingApprovals.map((approval) => (
                        <div key={approval._id} className="approval-card">
                            <div className="approval-header">
                                <div className="event-info">
                                    <h4>{approval.event.eventName}</h4>
                                    <span className="event-type">Merchandise</span>
                                </div>
                                <div className="approval-status">
                                    <span className="status-badge pending">Pending</span>
                                </div>
                            </div>

                            <div className="approval-content">
                                <div className="customer-info">
                                    <h5>Customer Details</h5>
                                    <p><strong>Name:</strong> {approval.user.firstName} {approval.user.lastName}</p>
                                    <p><strong>Email:</strong> {approval.user.email}</p>
                                    <p><strong>Uploaded:</strong> {formatDate(approval.paymentProof.uploadedAt)}</p>
                                </div>

                                <div className="order-info">
                                    <h5>Order Details</h5>
                                    <div className="items-list">
                                        {approval.purchasedItems.map((item, index) => (
                                            <div key={index} className="item-row">
                                                <span>{item.item.itemName}</span>
                                                <span>×{item.quantity}</span>
                                                <span>{formatCurrency(item.price)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="total-cost">
                                        <strong>Total: {formatCurrency(calculateTotalCost(approval.purchasedItems))}</strong>
                                    </div>
                                </div>

                                <div className="payment-proof">
                                    <h5>Payment Proof</h5>
                                    {approval.paymentProof.proofImage && (
                                        <div className="proof-image-container">
                                            <img 
                                                src={`http://localhost:5000${approval.paymentProof.proofImage}`}
                                                alt="Payment Proof"
                                                className="proof-image"
                                                onClick={() => window.open(`http://localhost:5000${approval.paymentProof.proofImage}`, '_blank')}
                                            />
                                            <p className="image-hint">Click to enlarge</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="approval-actions">
                                <button
                                    className="btn btn-approve"
                                    onClick={() => handleApprove(approval._id)}
                                    disabled={processingId === approval._id}
                                >
                                    {processingId === approval._id ? 'Processing...' : 'Approve'}
                                </button>
                                <button
                                    className="btn btn-reject"
                                    onClick={() => handleRejectClick(approval)}
                                    disabled={processingId === approval._id}
                                >
                                    {processingId === approval._id ? 'Processing...' : 'Reject'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {rejectionModal && (
                <div className="modal-overlay">
                    <div className="rejection-modal">
                        <h4>Reject Payment</h4>
                        <p>Event: {rejectionModal.event.eventName}</p>
                        <p>Customer: {rejectionModal.user.firstName} {rejectionModal.user.lastName}</p>
                        
                        <div className="form-group">
                            <label htmlFor="rejectionReason">Rejection Reason:</label>
                            <textarea
                                id="rejectionReason"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Please provide a reason for rejection..."
                                rows={4}
                                required
                            />
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn btn-reject"
                                onClick={handleReject}
                                disabled={!rejectionReason.trim() || processingId === rejectionModal._id}
                            >
                                {processingId === rejectionModal._id ? 'Processing...' : 'Reject Payment'}
                            </button>
                            <button
                                className="btn btn-cancel"
                                onClick={() => {
                                    setRejectionModal(null);
                                    setRejectionReason('');
                                }}
                                disabled={processingId === rejectionModal._id}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentApproval;
