import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./shared/components/ProtectedRoute";

// ── AUTH ──
import Login from "./auth/pages/BuyerLogin";
import AdminLogin from "./auth/pages/AdminLogin";
import Register from "./auth/pages/Register";
import RegistrationChoice from "./auth/pages/RegistrationChoice";

// ── ADMIN ──
import AdminLayout from "./admin/layouts/AdminLayout";
import AdminDashboard from "./admin/pages/Dashboard/Dashboard";
import Registrations from "./admin/pages/registrations/Registrations";
import AdminUsers from "./admin/pages/Users/Users";
import AdminComplaints from "./admin/pages/Complaints/Complaints";
import AdminCommission from "./admin/pages/Commission/Commission";
import AdminReports from "./admin/pages/Reports/Reports";
import AdminSettings from "./admin/pages/Settings/Settings";
import AccountSettings from "./admin/pages/AccountSettings/AccountSettings";
import AdminChat from "./admin/pages/Chat/Chat";
import SellerCompliance from "./admin/pages/SellerCompliance/SellerCompliance";

// ── BUYER ──
import BuyerHome from "./buyer/pages/Home/Home";
import BuyerCart from "./buyer/pages/Cart/Cart";
import BuyerCategories from "./buyer/pages/Categories/Categories";
import BuyerChat from "./buyer/pages/Chat/Chat";
import BuyerCheckout from "./buyer/pages/Checkout/Checkout";
import BuyerOrderDetails from "./buyer/pages/OrderDetails/OrderDetails";
import BuyerOrders from "./buyer/pages/Orders/Orders";
import BuyerProductDetails from "./buyer/pages/ProductDetails/ProductDetails";
import BuyerReviews from "./buyer/pages/Reviews/Reviews";
import BuyerAccount from "./buyer/pages/Account/Account";
import BuyerLayout from "./buyer/layouts/BuyerLayout";
import BuyerWishlist from "./buyer/pages/Wishlist/Wishlist";

// ── SELLER ──
import SellerLayout from "./seller/layouts/SellerLayout";
import SellerDashboard from "./seller/pages/Dashboard";
import SellerInventory from "./seller/pages/Inventory";
import SellerOrders from "./seller/pages/Orders";
import SellerLogistics from "./seller/pages/Logistics";
import SellerFeedback from "./seller/pages/Feedback";
import SellerReports from "./seller/pages/Reports";
import SellerChat from "./seller/pages/Chat";
import SellerAccountSettings from "./seller/pages/AccountSettings";

// ── COURIER ──
import CourierDashboard from "./courier/pages/Dashboard";
import CourierChat from "./courier/pages/Chat";
import CourierDeliveries from "./courier/pages/Deliveries";
import CourierDeliveryDetails from "./courier/pages/DeliveryDetails";
import CourierEarnings from "./courier/pages/Earnings";
import CourierHistory from "./courier/pages/History";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* =====================================================
                    AUTHENTICATION
                   ===================================================== */}

                <Route path="/login" element={<Login />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                <Route path="/register" element={<RegistrationChoice />} />
                <Route path="/register/:role" element={<Register />} />

                <Route
                    path="/seller-register"
                    element={
                        <Navigate
                            to="/register/seller"
                            replace
                        />
                    }
                />

                {/* =====================================================
                    BUYER / PUBLIC STOREFRONT
                ===================================================== */}

                <Route element={<BuyerLayout />}>

                    {/* PUBLIC / GUEST */}

                    <Route
                        path="/"
                        element={<BuyerHome />}
                    />

                    <Route
                        path="/shop"
                        element={<BuyerCategories />}
                    />

                    <Route
                        path="/products/:id"
                        element={<BuyerProductDetails />}
                    />

                    <Route
                        path="/cart"
                        element={<BuyerCart />}
                    />

                    {/* BUYER AUTHENTICATED */}

                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={["buyer"]}
                            />
                        }
                    >

                        <Route
                            path="/checkout"
                            element={<BuyerCheckout />}
                        />

                        <Route
                            path="/orders"
                            element={<BuyerOrders />}
                        />

                        <Route
                            path="/orders/:id"
                            element={<BuyerOrderDetails />}
                        />

                        <Route
                            path="/reviews"
                            element={<BuyerReviews />}
                        />

                        <Route
                            path="/account"
                            element={<BuyerAccount />}
                        />

                        <Route
                            path="/wishlist"
                            element={<BuyerWishlist />}
                        />

                        <Route
                            path="/buyer/chat"
                            element={<BuyerChat />}
                        />

                    </Route>

                </Route>

                {/* =====================================================
                    ADMIN - ADMIN ONLY
                   ===================================================== */}

                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>

                    <Route path="/admin" element={<AdminLayout />}>

                        <Route
                            index
                            element={
                                <Navigate
                                    to="/admin/dashboard"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="dashboard"
                            element={<AdminDashboard />}
                        />

                        <Route
                            path="registrations"
                            element={<Registrations />}
                        />

                        <Route
                            path="users"
                            element={<AdminUsers />}
                        />

                        <Route
                            path="seller-compliance"
                            element={<SellerCompliance />}
                        />

                        <Route
                            path="complaints"
                            element={<AdminComplaints />}
                        />

                        <Route
                            path="commission"
                            element={<AdminCommission />}
                        />

                        <Route
                            path="reports"
                            element={<AdminReports />}
                        />

                        <Route
                            path="settings"
                            element={<AdminSettings />}
                        />

                        <Route
                            path="account-settings"
                            element={<AccountSettings />}
                        />

                        <Route
                            path="chat"
                            element={<AdminChat />}
                        />

                    </Route>

                </Route>

                {/* =====================================================
                    SELLER - SELLER ONLY
                   ===================================================== */}

                <Route element={<ProtectedRoute allowedRoles={["seller"]} />}>

                    <Route
                        path="/seller"
                        element={<SellerLayout />}
                    >

                        <Route
                            index
                            element={
                                <Navigate
                                    to="/seller/dashboard"
                                    replace
                                />
                            }
                        />

                        <Route
                            path="dashboard"
                            element={<SellerDashboard />}
                        />

                        <Route
                            path="inventory"
                            element={<SellerInventory />}
                        />

                        <Route
                            path="orders"
                            element={<SellerOrders />}
                        />

                        <Route
                            path="logistics"
                            element={<SellerLogistics />}
                        />

                        <Route
                            path="feedback"
                            element={<SellerFeedback />}
                        />

                        <Route
                            path="reports"
                            element={<SellerReports />}
                        />

                        <Route
                            path="chat"
                            element={<SellerChat />}
                        />

                        <Route
                            path="account-settings"
                            element={<SellerAccountSettings />}
                        />

                    </Route>

                </Route>

                {/* =====================================================
                    COURIER / RIDER - RIDER ONLY
                   ===================================================== */}

                <Route element={<ProtectedRoute allowedRoles={["rider"]} />}>

                    <Route
                        path="/courier/dashboard"
                        element={<CourierDashboard />}
                    />

                    <Route
                        path="/courier/deliveries"
                        element={<CourierDeliveries />}
                    />

                    <Route
                        path="/courier/deliveries/:id"
                        element={<CourierDeliveryDetails />}
                    />

                    <Route
                        path="/courier/earnings"
                        element={<CourierEarnings />}
                    />

                    <Route
                        path="/courier/history"
                        element={<CourierHistory />}
                    />

                    <Route
                        path="/courier/chat"
                        element={<CourierChat />}
                    />

                </Route>

                {/* =====================================================
                    FALLBACK
                   ===================================================== */}

                <Route
                    path="*"
                    element={<Navigate to="/" replace />}
                />

            </Routes>
        </BrowserRouter>
    );
}

export default App;