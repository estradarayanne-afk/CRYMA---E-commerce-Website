import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";

import BuyerLayout from "./layouts/BuyerLayout";
import BuyerHome from "./pages/buyer/Home";
import Categories from "./pages/buyer/Categories";

import AdminDashboard from "./pages/admin/Dashboard/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import Registrations from "./pages/admin/Registrations/Registrations";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* ==========================================
                    PUBLIC CRYMA STOREFRONT

                    Guest users can enter and browse
                    without logging in.
                   ========================================== */}
                <Route element={<BuyerLayout />}>
    			<Route path="/" element={<BuyerHome />} />
    			<Route path="/shop" element={<Categories />} />
		</Route>

                {/* ==========================================
                    AUTHENTICATION
                   ========================================== */}
                <Route path="/login" element={<Login />} />

                {/* ==========================================
                    PROTECTED ADMIN AREA
                   ========================================== */}
                <Route
                    path="/admin"
                    element={
                        <ProtectedRoute>
                            <AdminLayout />
                        </ProtectedRoute>
                    }
                >
                    <Route
                        path="dashboard"
                        element={<AdminDashboard />}
                    />

                    <Route
                        path="registrations"
                        element={<Registrations />}
                    />
                </Route>

                {/* ==========================================
                    UNKNOWN ROUTES
                   ========================================== */}
                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;