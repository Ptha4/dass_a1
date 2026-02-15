import React, { useState } from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const { email, password } = formData;

    const onChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await authService.login(email, password);
            setMessage('Login successful!');
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
            setMessage(error.response?.data?.msg || error.message || 'Login failed');
        }
    };

    return (
        <div className="login-container">
            <h2>Login</h2>
            <form onSubmit={onSubmit}>
                <div className="form-group">
                    <label>Email:</label>
                    <input type="email" name="email" value={email} onChange={onChange} required />
                </div>
                <div className="form-group">
                    <label>Password:</label>
                    <input type="password" name="password" value={password} onChange={onChange} required />
                </div>
                <button type="submit">Login</button>
            </form>
            {message && <p className="message">{message}</p>}
        </div>
    );
};

export default Login;