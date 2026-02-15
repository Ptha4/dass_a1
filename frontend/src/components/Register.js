import React, { useState } from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';

const Register = () => {
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
    const navigate = useNavigate();

    const { firstName, lastName, email, participantType, collegeOrOrgName, contactNumber, password, password2 } = formData;

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (password !== password2) {
            setMessage('Passwords do not match');
        } else {
            try {
                await authService.register({
                    firstName,
                    lastName,
                    email,
                    participantType,
                    collegeOrOrgName,
                    contactNumber,
                    password,
                });
                setMessage('Registration successful! Logging in...');
                // Automatically log in the user after successful registration
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
            }
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
                <button type="submit">Register</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default Register;