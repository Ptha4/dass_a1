import React, { useState } from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';

const RegisterContent = () => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        participantType: 'Non-IIIT Participant', // Default
        collegeOrOrgName: '',
        contactNumber: '',
        password: '',
        password2: '',
        category: '', // For organizers, not directly used in participant registration
        description: '' // For organizers, not directly used in participant registration
    });
    const [message, setMessage] = useState('');
    const [captchaToken, setCaptchaToken] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const navigate = useNavigate();

    const { executeRecaptcha } = useGoogleReCaptcha();

    const { firstName, lastName, email, participantType, collegeOrOrgName, contactNumber, password, password2 } = formData;

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCaptchaVerify = async () => {
        console.log('Starting CAPTCHA verification...');
        console.log('Site key:', process.env.REACT_APP_RECAPTCHA_SITE_KEY);
        
        // For development with test keys, bypass reCAPTCHA entirely
        if (process.env.REACT_APP_RECAPTCHA_SITE_KEY === '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4wifDy') {
            console.log('Using test reCAPTCHA key - bypassing verification for development');
            setMessage('Using test reCAPTCHA key - bypassing verification for development');
            setCaptchaToken('test-token-' + Date.now());
            return;
        }
        
        try {
            if (!executeRecaptcha) {
                console.error('executeRecaptcha is not available');
                setMessage('reCAPTCHA not initialized. Please refresh the page.');
                return;
            }
            
            console.log('Calling executeRecaptcha...');
            const token = await executeRecaptcha('register');
            console.log('Token received:', token ? 'Success' : 'Failed');
            
            if (token) {
                setCaptchaToken(token);
                setMessage('CAPTCHA verified successfully!');
            } else {
                throw new Error('No token received from reCAPTCHA');
            }
        } catch (error) {
            console.error('reCAPTCHA verification failed:', error);
            console.error('Error details:', error.message);
            setMessage('CAPTCHA verification failed: ' + error.message);
        }
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        
        if (password !== password2) {
            setMessage('Passwords do not match');
            return;
        }
        
        if (!captchaToken) {
            setMessage('Please complete the CAPTCHA verification');
            return;
        }
        
        setIsSubmitting(true);
        try {
            await authService.register({
                firstName,
                lastName,
                email,
                participantType,
                collegeOrOrgName,
                contactNumber,
                password,
                recaptchaToken: captchaToken
            });
            setMessage('Registration successful! Logging in...');
            // Automatically log in user after successful registration
            const response = await authService.login(email, password);
            const currentUser = authService.getCurrentUser(); // Get updated user info from localStorage

            if (currentUser && !currentUser.isAdmin && !currentUser.isOrganiser && !currentUser.onboardingComplete) {
                navigate('/onboarding');
            } else if (response.isAdmin) {
                navigate('/admin-dashboard');
            } else if (response.isOrganiser) {
                navigate('/organiser-dashboard');
            } else {
                navigate('/participant-dashboard');
            }
        } catch (error) {
            setMessage(error.response?.data?.msg || error.message || 'Registration failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="register-container">
            <h2>Register</h2>
            <form onSubmit={onSubmit}>
                <div className="form-group">
                    <label>First Name:</label>
                    <input type="text" name="firstName" value={firstName} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Last Name:</label>
                    <input type="text" name="lastName" value={lastName} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Email:</label>
                    <input type="email" name="email" value={email} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Participant Type:</label>
                    <select name="participantType" value={participantType} onChange={onChange}>
                        <option value="Non-IIIT Participant">Non-IIIT Participant</option>
                        <option value="IIIT Participant">IIIT Participant</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>College/Organization Name:</label>
                    <input type="text" name="collegeOrOrgName" value={collegeOrOrgName} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Contact Number:</label>
                    <input type="text" name="contactNumber" value={contactNumber} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Password:</label>
                    <input type="password" name="password" value={password} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Confirm Password:</label>
                    <input type="password" name="password2" value={password2} onChange={onChange} required />
                </div>
                
                <div className="captcha-wrapper">
                    <div className="captcha-container">
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M9 2a1 1 0 00-2 2v1a1 1 0 112 2.83 4.16 4.16l-5.78 4.16-5.78 4.16-1.06 1.06-1.06 1.06L9 11.09l1.414 1.414A1 1 0 01.414-1.414L2.83 6.17z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-800">
                                        {captchaToken ? '✓ CAPTCHA verified successfully!' : 'Please click below to verify you are human'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            type="button" 
                            onClick={handleCaptchaVerify}
                            disabled={isSubmitting}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                        >
                            {captchaToken ? '✓ Verified' : 'Verify I\'m Human'}
                        </button>
                    </div>
                </div>
                
                <button type="submit" disabled={isSubmitting || !captchaToken}>
                    {isSubmitting ? 'Registering...' : 'Register'}
                </button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

const Register = () => {
    return (
        <GoogleReCaptchaProvider reCaptchaKey={process.env.REACT_APP_RECAPTCHA_SITE_KEY}>
            <RegisterContent />
        </GoogleReCaptchaProvider>
    );
};

export default Register;