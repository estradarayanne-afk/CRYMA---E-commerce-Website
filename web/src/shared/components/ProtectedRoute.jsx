import { Navigate, Outlet, useLocation } from "react-router-dom";

const ROLE_HOME = {
    admin: "/admin/dashboard",
    seller: "/seller/dashboard",
    rider: "/courier/dashboard",
    buyer: "/",
};

function getStoredUser() {
    try {
        const storedUser = localStorage.getItem("user");
        return storedUser ? JSON.parse(storedUser) : null;
    } catch {
        return null;
    }
}

function ProtectedRoute({ allowedRoles = [] }) {
    const location = useLocation();

    const token = localStorage.getItem("token");
    const user = getStoredUser();

    /*
     * No valid session:
     * send the user to login and remember where
     * they originally tried to go.
     */
    if (!token || !user) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ from: location }}
            />
        );
    }

    /*
     * The route does not specify a role restriction.
     * Any authenticated user may continue.
     */
    if (allowedRoles.length === 0) {
        return <Outlet />;
    }

    /*
     * User is authenticated but does not have
     * permission to access this section.
     */
    if (!allowedRoles.includes(user.role)) {
        const destination = ROLE_HOME[user.role] || "/";

        return (
            <Navigate
                to={destination}
                replace
                state={{
                    message: "You do not have permission to access that page.",
                    type: "error",
                }}
            />
        );
    }

    return <Outlet />;
}

export default ProtectedRoute;