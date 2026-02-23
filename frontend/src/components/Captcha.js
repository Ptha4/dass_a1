import React, { useState, useEffect } from 'react';
import { useGoogleReCaptcha, GoogleReCaptchaProvider } from 'react-google-recaptcha-v3';

const Captcha = ({ onVerify, onExpire, onError, action = 'submit' }) => {
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState(null);
    
    const { executeRecaptcha } = useGoogleReCaptcha(
        process.env.REACT_APP_RECAPTCHA_SITE_KEY,
        {
            action: action,
        }
    );

    const handleVerify = async (token) => {
        setIsVerifying(true);
        setError(null);
        
        try {
            await onVerify(token);
        } catch (err) {
            setError(err.message || 'CAPTCHA verification failed');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleClick = async () => {
        try {
            const token = await executeRecaptcha();
            await handleVerify(token);
        } catch (err) {
            setError(err.message || 'CAPTCHA verification failed');
            if (onError) onError(err);
        }
    };

    // Reset error when action changes
    useEffect(() => {
        setError(null);
    }, [action]);

    return (
        <GoogleReCaptchaProvider reCaptchaKey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}>
            <div className="captcha-container">
                {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-red-800">{error}</p>
                            </div>
                        </div>
                    </div>
                )}
            
                <button
                    type="button"
                    onClick={handleClick}
                    disabled={isVerifying}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isVerifying ? 'Verifying...' : 'Verify you are human'}
                </button>
            </div>
        </GoogleReCaptchaProvider>
    );
};

export default Captcha;
