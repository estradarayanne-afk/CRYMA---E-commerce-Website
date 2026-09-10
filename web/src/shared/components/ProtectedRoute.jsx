import { Navigate, Outlet } from "react-router-dom";

function ProtectedRoute() {
    const token = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    let user = null;
    try {
        user = storedUser ? JSON.parse(storedUser) : null;
    } catch {
        user = null;
    }

    if (!token || !user || user.role !== "admin") {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

export default ProtectedRoute;
