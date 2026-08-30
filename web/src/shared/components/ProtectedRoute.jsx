import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    let user;

    try {
        user = storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Invalid user data:", error);
        user = null;
    }

    // No authentication
    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    // Only admin can access admin routes
    if (user.role !== "admin") {
        return <Navigate to="/login" replace />;
    }

    // Authentication successful
    return children;
}

export default ProtectedRoute;
