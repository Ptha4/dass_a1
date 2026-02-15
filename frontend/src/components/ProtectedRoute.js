import React from 'react';
import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

const ProtectedRoute = ({ children, roles }) => {
    const currentUser = authService.getCurrentUser();

    if (!currentUser || !currentUser.token) {
        // Not logged in, redirect to login page
        return <Navigate to="/login" replace />;
    }

    if (roles && roles.length > 0) {
        const userRoles = [];
        if (currentUser.isAdmin) userRoles.push('admin');
        if (currentUser.isOrganiser) userRoles.push('organiser');
        // Assuming regular participants don't have a specific role flag, or you can add one if needed

        const hasRequiredRole = roles.some(role => userRoles.includes(role));

        if (!hasRequiredRole) {
            // Not authorized, redirect to a forbidden page or home
            return <Navigate to="/" replace />; // Or a /forbidden page
        }
    }

    return children;
};

export default ProtectedRoute;