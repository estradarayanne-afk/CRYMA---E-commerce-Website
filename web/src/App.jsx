import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// ── AUTH ──
import AdminLogin  from "./auth/pages/AdminLogin";
import BuyerLogin  from "./auth/pages/BuyerLogin";
import Register    from "./auth/pages/Register";

// ── SHARED ──
import ProtectedRoute from "./shared/components/ProtectedRoute";

// ── ADMIN ──
import AdminLayout      from "./admin/layouts/AdminLayout";
import AdminDashboard   from "./admin/pages/Dashboard";
import Registrations    from "./admin/pages/registrations/Registrations";
import AdminUsers       from "./admin/pages/Users";
import AdminComplaints  from "./admin/pages/Complaints";
import AdminCommission  from "./admin/pages/Commission";
import AdminReports     from "./admin/pages/Reports";
import AdminSettings    from "./admin/pages/Settings";
import AdminChat        from "./admin/pages/Chat";
import SellerCompliance from "./admin/pages/SellerCompliance";

// ── BUYER ──
import BuyerHome           from "./buyer/pages/Home";
import BuyerCart           from "./buyer/pages/Cart";
import BuyerCategories     from "./buyer/pages/Categories";
import BuyerChat           from "./buyer/pages/Chat";
import BuyerCheckout       from "./buyer/pages/Checkout";
import BuyerOrderDetails   from "./buyer/pages/OrderDetails";
import BuyerOrders         from "./buyer/pages/Orders";
import BuyerProductDetails from "./buyer/pages/ProductDetails";
import BuyerReviews        from "./buyer/pages/Reviews";

// ── SELLER ──
import SellerLayout    from "./seller/layouts/SellerLayout";
import SellerDashboard from "./seller/pages/Dashboard";
import SellerInventory from "./seller/pages/Inventory";
import SellerOrders    from "./seller/pages/Orders";
import SellerLogistics from "./seller/pages/Logistics";
import SellerFeedback  from "./seller/pages/Feedback";
import SellerReports   from "./seller/pages/Reports";
import SellerChat      from "./seller/pages/Chat";

// ── COURIER ──
import CourierDashboard       from "./courier/pages/Dashboard";
import CourierChat            from "./courier/pages/Chat";
import CourierDeliveries      from "./courier/pages/Deliveries";
import CourierDeliveryDetails from "./courier/pages/DeliveryDetails";
import CourierEarnings        from "./courier/pages/Earnings";
import CourierHistory         from "./courier/pages/History";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* ── BUYER STOREFRONT ── */}
                <Route path="/"             element={<BuyerHome />} />
                <Route path="/shop"         element={<BuyerCategories />} />
                <Route path="/cart"         element={<BuyerCart />} />
                <Route path="/checkout"     element={<BuyerCheckout />} />
                <Route path="/orders"       element={<BuyerOrders />} />
                <Route path="/orders/:id"   element={<BuyerOrderDetails />} />
                <Route path="/products/:id" element={<BuyerProductDetails />} />
                <Route path="/reviews"      element={<BuyerReviews />} />
                <Route path="/buyer/chat"   element={<BuyerChat />} />

                {/* ── AUTH ── */}
                <Route path="/login"        element={<AdminLogin />} />
                <Route path="/buyer-login"  element={<BuyerLogin />} />
                <Route path="/register"     element={<Register />} />

                {/* ── ADMIN (protected) ── */}
                <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
                    <Route path="dashboard"         element={<AdminDashboard />} />
                    <Route path="registrations"     element={<Registrations />} />
                    <Route path="users"             element={<AdminUsers />} />
                    <Route path="seller-compliance" element={<SellerCompliance />} />
                    <Route path="complaints"        element={<AdminComplaints />} />
                    <Route path="commission"        element={<AdminCommission />} />
                    <Route path="reports"           element={<AdminReports />} />
                    <Route path="settings"          element={<AdminSettings />} />
                    <Route path="chat"              element={<AdminChat />} />
                </Route>

                {/* ── SELLER ── */}
                <Route path="/seller" element={<SellerLayout />}>
                    <Route index element={<Navigate to="/seller/dashboard" replace />} />
                    <Route path="dashboard"  element={<SellerDashboard />} />
                    <Route path="inventory"  element={<SellerInventory />} />
                    <Route path="orders"     element={<SellerOrders />} />
                    <Route path="logistics"  element={<SellerLogistics />} />
                    <Route path="feedback"   element={<SellerFeedback />} />
                    <Route path="reports"    element={<SellerReports />} />
                    <Route path="chat"       element={<SellerChat />} />
                </Route>

                {/* ── COURIER ── */}
                <Route path="/courier/dashboard"       element={<CourierDashboard />} />
                <Route path="/courier/deliveries"      element={<CourierDeliveries />} />
                <Route path="/courier/deliveries/:id"  element={<CourierDeliveryDetails />} />
                <Route path="/courier/earnings"        element={<CourierEarnings />} />
                <Route path="/courier/history"         element={<CourierHistory />} />
                <Route path="/courier/chat"            element={<CourierChat />} />

                {/* ── FALLBACK ── */}
                <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
        </BrowserRouter>
    );
}

export default App;
