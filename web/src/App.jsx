import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./shared/components/ProtectedRoute";

// ── AUTH ──
import Login from "./auth/pages/BuyerLogin";
import AdminLogin from "./auth/pages/AdminLogin";
import Register from "./auth/pages/Register";
import RegistrationChoice from "./auth/pages/RegistrationChoice";
import PasswordRecovery from "./auth/pages/PasswordRecovery";
import PolicyPage from "./shared/pages/PolicyPage";

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
import BuyerVouchers from "./buyer/pages/Vouchers/Vouchers";
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
import CourierLayout from "./courier/layouts/CourierLayout";
import AdminVouchers from "./admin/pages/Vouchers/Vouchers";
import LogisticsLayout from "./logistics/layouts/LogisticsLayout";
import LogisticsDashboard from "./logistics/pages/Dashboard";
import LogisticsUnavailable from "./logistics/pages/LogisticsUnavailable";
import RiderManagement from "./logistics/pages/RiderManagement";
import ParcelOperations from "./logistics/pages/ParcelOperations";
import LogisticsProfile from "./logistics/pages/Profile";
import LogisticsAccountSettings from "./logistics/pages/AccountSettings";

// ── COURIER ──
import CourierDashboard from "./courier/pages/Dashboard";
import CourierChat from "./courier/pages/Chat";
import CourierDeliveries from "./courier/pages/Deliveries";
import CourierDeliveryDetails from "./courier/pages/DeliveryDetails";
import CourierPickups from "./courier/pages/Pickups";
import CourierPickupDetails from "./courier/pages/PickupDetails";
import CourierEarnings from "./courier/pages/Earnings";
import CourierHistory from "./courier/pages/History";
import CourierProfile from "./courier/pages/Profile";
import CourierAccountSettings from "./courier/pages/AccountSettings";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* =====================================================
                    AUTHENTICATION
                   ===================================================== */}

                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<PasswordRecovery />} />
                <Route path="/reset-password" element={<PasswordRecovery reset />} />
                <Route path="/admin/login" element={<AdminLogin />} />

                <Route path="/register" element={<RegistrationChoice />} />
                <Route path="/register/:role" element={<Register />} />

                <Route
                    path="/seller-register"
                    element={
                        <Navigate
                            to="/register"
                            replace
                        />
                    }
                />

                {/* =====================================================
                    BUYER / PUBLIC STOREFRONT
                ===================================================== */}

                <Route element={<BuyerLayout />}>

                    <Route path="/terms" element={<PolicyPage type="terms" />} />
                    <Route path="/privacy" element={<PolicyPage type="privacy" />} />
                    <Route path="/delivery-and-payments" element={<PolicyPage type="delivery" />} />

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



                    {/* BUYER AUTHENTICATED */}

                    <Route
                        element={
                            <ProtectedRoute
                                allowedRoles={["buyer"]}
                            />
                        }
                    >
                        <Route
                            path="/cart"
                            element={<BuyerCart />}
                        />

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
                            path="/buyer/vouchers"
                            element={<BuyerVouchers />}
                        />

                        <Route
                            path="/wishlist"
                            element={<BuyerWishlist />}
                        />

                        <Route
                            path="/buyer/chat"
                            element={<BuyerChat key="seller-messages" />}
                        />

                        <Route
                            path="/buyer/support"
                            element={<BuyerChat key="customer-support" supportOnly />}
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

                        <Route path="vouchers" element={<AdminVouchers />} />

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
                    <Route path="/courier" element={<CourierLayout />}>
                        <Route index element={<Navigate to="/courier/dashboard" replace />} />
                        <Route path="dashboard" element={<CourierDashboard />} />
                        <Route path="pickups" element={<CourierPickups />} />
                        <Route path="pickups/:id" element={<CourierPickupDetails />} />
                        <Route path="deliveries" element={<CourierDeliveries />} />
                        <Route path="deliveries/:id" element={<CourierDeliveryDetails />} />
                        <Route path="history" element={<CourierHistory />} />
                        <Route path="earnings" element={<CourierEarnings />} />
                        <Route path="chat" element={<CourierChat />} />
                        <Route path="profile" element={<CourierProfile />} />
                        <Route path="settings" element={<CourierAccountSettings />} />
                    </Route>
                </Route>

                {/* LOGISTICS / SORTING CENTER - LOGISTICS ONLY */}
                <Route element={<ProtectedRoute allowedRoles={["logistics"]} />}>
                    <Route path="/logistics" element={<LogisticsLayout />}>
                        <Route index element={<Navigate to="/logistics/dashboard" replace />} />
                        <Route path="dashboard" element={<LogisticsDashboard />} />
                        <Route path="riders" element={<RiderManagement />} />
                        <Route path="pickups" element={<ParcelOperations section="pickups" />} />
                        <Route path="incoming-parcels" element={<ParcelOperations section="incoming" />} />
                        <Route path="sorting" element={<ParcelOperations section="sorting" />} />
                        <Route path="delivery-assignment" element={<ParcelOperations section="assignment" />} />
                        <Route path="delivery-monitoring" element={<ParcelOperations section="monitoring" />} />
                        <Route path="reports" element={<ParcelOperations section="reports" />} />
                        <Route path="messages" element={<LogisticsUnavailable title="Messages" />} />
                        <Route path="profile" element={<LogisticsProfile />} />
                        <Route path="settings" element={<LogisticsAccountSettings />} />
                        <Route path="account" element={<Navigate to="/logistics/profile" replace />} />
                    </Route>
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
