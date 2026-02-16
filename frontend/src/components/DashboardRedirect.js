import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const DashboardRedirect = () => {
    const user = authService.getCurrentUser();
    if (!user) return <Navigate to="/login" replace />;
    if (user.isAdmin) return <Navigate to="/admin-dashboard" replace />;
    if (user.isOrganiser) return <Navigate to="/organiser-dashboard" replace />;
    return <Navigate to="/participant-dashboard" replace />;
};

export default DashboardRedirect;
