import React, { useState } from 'react';
import eventService from '../services/eventService';
import authService from '../services/authService';
import './PaymentProofUpload.css';

const PaymentProofUpload = ({ registrationId, onUploadSuccess }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const token = authService.getCurrentUser()?.token;

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Validate file type
            if (!file.type.startsWith('image/')) {
                setError('Please select an image file (JPG, PNG, etc.)');
                return;
            }
            
            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB');
                return;
            }
            
            setSelectedFile(file);
            setError('');
            setSuccess('');
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !token) return;
        
        setUploading(true);
        setError('');
        setSuccess('');
        
        try {
            const result = await eventService.uploadPaymentProof(registrationId, selectedFile, token);
            setSuccess('Payment proof uploaded successfully! Waiting for approval.');
            setSelectedFile(null);
            
            // Reset file input
            const fileInput = document.getElementById('payment-proof-input');
            if (fileInput) fileInput.value = '';
            
            // Notify parent component
            if (onUploadSuccess) {
                onUploadSuccess(result);
            }
        } catch (err) {
            console.error('Upload error:', err);
            setError(err.response?.data?.message || 'Failed to upload payment proof');
        } finally {
            setUploading(false);
        }
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="payment-proof-upload">
            <h4>Upload Payment Proof</h4>
            <p>Please upload a screenshot or photo of your payment confirmation.</p>
            
            {error && (
                <div className="error-message">
                    {error}
                    <button onClick={() => setError('')} className="close-btn">×</button>
                </div>
            )}
            
            {success && (
                <div className="success-message">
                    {success}
                    <button onClick={() => setSuccess('')} className="close-btn">×</button>
                </div>
            )}
            
            <div className="upload-area">
                <input
                    type="file"
                    id="payment-proof-input"
                    accept="image/*"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                />
                
                {!selectedFile ? (
                    <div 
                        className="upload-placeholder"
                        onClick={() => document.getElementById('payment-proof-input').click()}
                    >
                        <div className="upload-icon">📷</div>
                        <p>Click to select payment proof image</p>
                        <small>Supported formats: JPG, PNG, GIF (Max 5MB)</small>
                    </div>
                ) : (
                    <div className="selected-file">
                        <div className="file-info">
                            <div className="file-icon">📄</div>
                            <div className="file-details">
                                <p className="file-name">{selectedFile.name}</p>
                                <small className="file-size">{formatFileSize(selectedFile.size)}</small>
                            </div>
                        </div>
                        
                        <div className="file-preview">
                            <img 
                                src={URL.createObjectURL(selectedFile)} 
                                alt="Payment proof preview"
                                className="preview-image"
                            />
                        </div>
                        
                        <div className="file-actions">
                            <button
                                className="btn btn-remove"
                                onClick={() => {
                                    setSelectedFile(null);
                                    setError('');
                                    setSuccess('');
                                    const fileInput = document.getElementById('payment-proof-input');
                                    if (fileInput) fileInput.value = '';
                                }}
                            >
                                Remove
                            </button>
                            <button
                                className="btn btn-upload"
                                onClick={handleUpload}
                                disabled={uploading}
                            >
                                {uploading ? 'Uploading...' : 'Upload Payment Proof'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="upload-instructions">
                <h5>Instructions:</h5>
                <ul>
                    <li>Make sure the payment details are clearly visible</li>
                    <li>Include transaction ID, amount, and date</li>
                    <li>Ensure the image is not blurry or cropped</li>
                    <li>Upload a recent payment proof (within last 24 hours)</li>
                </ul>
            </div>
        </div>
    );
};

export default PaymentProofUpload;
