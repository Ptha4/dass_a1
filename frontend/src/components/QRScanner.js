import React, { useState, useRef, useCallback, useEffect } from 'react';
import QrScanner from 'qr-scanner';
import eventService from '../services/eventService';
import authService from '../services/authService';
import './QRScanner.css';

const QRScanner = ({ eventId, onScanComplete }) => {
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [manualMode, setManualMode] = useState(false);
    const [manualTicketId, setManualTicketId] = useState('');
    const videoRef = useRef(null);
    const qrScannerRef = useRef(null);
    const fileInputRef = useRef(null);

    const token = authService.getCurrentUser()?.token;

    const handleScan = useCallback(async (result) => {
        if (!result || !result.data) return;

        try {
            setError('');
            setScanning(true);
            
            const scanData = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
            
            console.log('Scanning QR code:', scanData);

            // Send to backend
            const response = await eventService.scanQRCode(scanData, eventId, token);
            
            setSuccess(response.message);
            onScanComplete(response.attendance);
            
            // Reset after 3 seconds
            setTimeout(() => {
                setSuccess('');
                setScanning(false);
            }, 3000);

        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to scan QR code');
            setScanning(false);
        }
    }, [eventId, onScanComplete, token]);

    // Initialize QR scanner
    useEffect(() => {
        if (!manualMode && videoRef.current && !qrScannerRef.current) {
            const qrScanner = new QrScanner(
                videoRef.current,
                result => {
                    if (result) {
                        handleScan(result);
                    }
                },
                {
                    highlightScanRegion: true,
                    highlightCodeOutline: true,
                }
            );

            qrScannerRef.current = qrScanner;
            
            qrScanner.start()
                .then(() => {
                    setError('');
                })
                .catch(err => {
                    console.error('QR Scanner error:', err);
                    setError('Camera access denied or not available');
                    setManualMode(true);
                });
        }

        return () => {
            if (qrScannerRef.current) {
                qrScannerRef.current.stop();
                qrScannerRef.current.destroy();
                qrScannerRef.current = null;
            }
        };
    }, [manualMode, handleScan]);

    const handleFileUpload = useCallback(async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            setError('');
            setScanning(true);

            // Read QR code from image
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    // For now, we'll simulate QR code reading from file
                    // In a real implementation, you'd use a QR code library
                    const simulatedQRData = JSON.stringify({
                        ticketId: `FILE-${Date.now()}`,
                        event: eventId,
                        type: 'file_upload'
                    });

                    const response = await eventService.scanQRCode(simulatedQRData, eventId, token, 'file_upload');
                    
                    setSuccess(response.message);
                    onScanComplete(response.attendance);
                    
                    setTimeout(() => {
                        setSuccess('');
                        setScanning(false);
                    }, 3000);

                } catch (err) {
                    setError('Failed to read QR code from image');
                    setScanning(false);
                }
            };
            reader.readAsDataURL(file);

        } catch (err) {
            setError('Failed to process image file');
            setScanning(false);
        }
    }, [eventId, onScanComplete, token]);

    const handleManualSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        if (!manualTicketId.trim()) {
            setError('Please enter a ticket ID');
            return;
        }

        try {
            setError('');
            setScanning(true);

            const qrData = JSON.stringify({
                ticketId: manualTicketId.trim(),
                event: eventId,
                type: 'manual'
            });

            const response = await eventService.scanQRCode(qrData, eventId, token, 'manual_override');
            
            setSuccess(response.message);
            onScanComplete(response.attendance);
            
            setTimeout(() => {
                setSuccess('');
                setScanning(false);
                setManualTicketId('');
            }, 3000);

        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Failed to process manual entry');
            setScanning(false);
        }
    }, [eventId, onScanComplete, token, manualTicketId]);

    const startCamera = useCallback(() => {
        setManualMode(false);
        setError('');
        setSuccess('');
    }, []);

    return (
        <div className="qr-scanner">
            <div className="scanner-header">
                <h3>QR Code Scanner</h3>
                <p>Scan participant QR codes to mark attendance</p>
            </div>

            {!manualMode ? (
                <div className="camera-section">
                    {scanning && (
                        <div className="scanning-overlay">
                            <div className="scanner-spinner"></div>
                            <p>Scanning...</p>
                        </div>
                    )}
                    
                    <div className="scanner-container">
                        <video ref={videoRef} style={{ width: '100%', height: '300px' }}></video>
                    </div>

                    <div className="scanner-controls">
                        <button 
                            onClick={() => setManualMode(true)}
                            className="btn btn-outline"
                            disabled={scanning}
                        >
                            Manual Entry
                        </button>
                    </div>
                </div>
            ) : (
                <div className="manual-section">
                    <h4>Manual Entry</h4>
                    <p>Enter ticket ID manually or upload QR code image</p>
                    
                    <form onSubmit={handleManualSubmit} className="manual-form">
                        <div className="form-group">
                            <label>Ticket ID:</label>
                            <input
                                type="text"
                                value={manualTicketId}
                                onChange={(e) => setManualTicketId(e.target.value)}
                                placeholder="Enter ticket ID"
                                disabled={scanning}
                                required
                            />
                        </div>
                        
                        <div className="form-group">
                            <label>Or Upload QR Code Image:</label>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                disabled={scanning}
                            />
                        </div>

                        <div className="form-actions">
                            <button 
                                type="submit" 
                                className="btn btn-primary"
                                disabled={scanning || !manualTicketId.trim()}
                            >
                                {scanning ? 'Processing...' : 'Mark Attendance'}
                            </button>
                            <button 
                                type="button" 
                                onClick={startCamera}
                                className="btn btn-outline"
                                disabled={scanning}
                            >
                                Back to Camera
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {error && (
                <div className="error-message">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="close-btn">×</button>
                </div>
            )}

            {success && (
                <div className="success-message">
                    <span>{success}</span>
                    <button onClick={() => setSuccess('')} className="close-btn">×</button>
                </div>
            )}
        </div>
    );
};

export default QRScanner;
