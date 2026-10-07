import { useEffect } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { requestBuyerSignIn } from "../utils/buyerAccess";

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
    const navigate = useNavigate();

    const token = localStorage.getItem("token");
    const user = getStoredUser();
    const missingSession = !token || !user;
    const buyerRoute = allowedRoles.includes("buyer");

    useEffect(() => {
        if (missingSession && buyerRoute) {
            requestBuyerSignIn({ from: location });
            navigate("/", { replace: true });
        }
    }, [buyerRoute, location, missingSession, navigate]);

    /*
     * No valid session:
     * send the user to login and remember where
     * they originally tried to go.
     */
    if (!token || !user) {
        if (buyerRoute) return null;
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
