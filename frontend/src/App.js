import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import Register from './components/Register';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import OrganiserDashboard from './components/OrganiserDashboard';
import ParticipantDashboard from './components/ParticipantDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import ParticipantOnboarding from './components/ParticipantOnboarding'; // Import ParticipantOnboarding
import EventDashboard from './components/EventDashboard'; // Import EventDashboard
import CreateEvent from './components/CreateEvent'; // Import CreateEvent
import FormBuilder from './components/FormBuilder'; // Import FormBuilder
import authService from './services/authService';
import './App.css'; // Assuming you have some basic styling

function App() {
    const [currentUser, setCurrentUser] = useState(authService.getCurrentUser());
    const navigate = useNavigate();
    const location = useLocation();

    // Re-sync user from localStorage when route changes (e.g. after login redirect)
    useEffect(() => {
        setCurrentUser(authService.getCurrentUser());
    }, [location.pathname]);

    useEffect(() => {
        const handleStorageChange = () => {
            setCurrentUser(authService.getCurrentUser());
        };

        window.addEventListener('storage', handleStorageChange);
        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    const handleLogout = () => {
        authService.logout();
        setCurrentUser(null);
        navigate('/login');
    };

    return (
        <div className="App">
                <nav>
                    <Link to="/">Home</Link>
                    {currentUser && currentUser.email && (
                        <span style={{ marginLeft: '10px', fontWeight: 'bold' }}>
                            Welcome, {currentUser.email}
                        </span>
                    )}
                    <div style={{ marginLeft: 'auto' }}> {/* Pushes login/logout to the right */}
                        {!currentUser ? (
                            <>
                                <Link to="/register">Register</Link>
                                <Link to="/login">Login</Link>
                            </>
                        ) : (
                            <button onClick={handleLogout}>Logout</button>
                        )}
                    </div>
                </nav>

                <Routes>
                    <Route path="/" element={<h1>Welcome to the Event Management System</h1>} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/login" element={<Login />} />

                    <Route
                        path="/admin-dashboard"
                        element={
                            <ProtectedRoute roles={['admin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/organiser-dashboard"
                        element={
                            <ProtectedRoute roles={['organiser']}>
                                <OrganiserDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/participant-dashboard"
                        element={
                            <ProtectedRoute> {/* No specific role for participant, just authenticated */}
                                <ParticipantDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/onboarding"
                        element={
                            <ProtectedRoute> {/* Protected for any authenticated user, logic inside component will handle participant type */}
                                <ParticipantOnboarding />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/events"
                        element={<EventDashboard />}
                    />
                    <Route
                        path="/create-event"
                        element={
                            <ProtectedRoute roles={['organiser']}>
                                <CreateEvent />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/form-builder/:eventId"
                        element={
                            <ProtectedRoute roles={['organiser']}>
                                <FormBuilder />
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </div>
    );
}

export default App;