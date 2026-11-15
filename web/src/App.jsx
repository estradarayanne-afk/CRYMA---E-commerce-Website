import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import ProtectedRoute from "./shared/components/ProtectedRoute";
import GlobalNetworkLoadingIndicator from "./shared/components/GlobalNetworkLoadingIndicator";
import DeliveryMessages from "./shared/components/DeliveryMessages";
import { isBuyerSession } from "./shared/utils/buyerAccess";

// â”€â”€ AUTH â”€â”€
const Login = lazy(() => import("./auth/pages/BuyerLogin"));
const AdminLogin = lazy(() => import("./auth/pages/AdminLogin"));
const Register = lazy(() => import("./auth/pages/Register"));
const EmailVerification = lazy(() => import("./auth/pages/EmailVerification"));
const DocumentCorrection = lazy(() => import("./auth/pages/DocumentCorrection"));
const RegistrationChoice = lazy(() => import("./auth/pages/RegistrationChoice"));
const PasswordRecovery = lazy(() => import("./auth/pages/PasswordRecovery"));
const PolicyPage = lazy(() => import("./shared/pages/PolicyPage"));

// â”€â”€ ADMIN â”€â”€
const AdminLayout = lazy(() => import("./admin/layouts/AdminLayout"));
const AdminDashboard = lazy(() => import("./admin/pages/Dashboard/Dashboard"));
const Registrations = lazy(() => import("./admin/pages/registrations/Registrations"));
const AdminUsers = lazy(() => import("./admin/pages/Users/Users"));
const AdminComplaints = lazy(() => import("./admin/pages/Complaints/Complaints"));
const AdminReports = lazy(() => import("./admin/pages/Reports/Reports"));
const AdminSettings = lazy(() => import("./admin/pages/Settings/Settings"));
const AccountSettings = lazy(() => import("./admin/pages/AccountSettings/AccountSettings"));
const AdminChat = lazy(() => import("./admin/pages/Chat/Chat"));
const AdminRefundRequests = lazy(() => import("./admin/pages/RefundRequests/RefundRequests"));
const AdminFinance = lazy(() => import("./admin/pages/Finance/Finance"));
const AdminParcelFlow = lazy(() => import("./admin/pages/ParcelFlow/ParcelFlow"));
const HubStaffManagement = lazy(() => import("./admin/pages/HubStaff/HubStaffManagement"));
const SellerCompliance = lazy(() => import("./admin/pages/SellerCompliance/SellerCompliance"));

// â”€â”€ BUYER â”€â”€
const BuyerHome = lazy(() => import("./buyer/pages/Home/Home"));
const BuyerCart = lazy(() => import("./buyer/pages/Cart/Cart"));
const BuyerCategories = lazy(() => import("./buyer/pages/Categories/Categories"));
const BuyerChat = lazy(() => import("./buyer/pages/Chat/Chat"));
const SellerChatRedirect = lazy(() => import("./buyer/pages/Chat/SellerChatRedirect"));
const BuyerCheckout = lazy(() => import("./buyer/pages/Checkout/Checkout"));
const BuyerOrderDetails = lazy(() => import("./buyer/pages/OrderDetails/OrderDetails"));
const BuyerOrders = lazy(() => import("./buyer/pages/Orders/Orders"));
const BuyerProductDetails = lazy(() => import("./buyer/pages/ProductDetails/ProductDetails"));
const BuyerReviews = lazy(() => import("./buyer/pages/Reviews/Reviews"));
const BuyerAccount = lazy(() => import("./buyer/pages/Account/Account"));
const BuyerVouchers = lazy(() => import("./buyer/pages/Vouchers/Vouchers"));
const BuyerLayout = lazy(() => import("./buyer/layouts/BuyerLayout"));
const BuyerWishlist = lazy(() => import("./buyer/pages/Wishlist/Wishlist"));
const PublicStorefront = lazy(() => import("./buyer/pages/Storefront"));

// â”€â”€ SELLER â”€â”€
const SellerLayout = lazy(() => import("./seller/layouts/SellerLayout"));
const SellerDashboard = lazy(() => import("./seller/pages/Dashboard"));
const SellerStorefront = lazy(() => import("./seller/pages/Storefront"));
const SellerInventory = lazy(() => import("./seller/pages/Inventory"));
const SellerVouchers = lazy(() => import("./seller/pages/Vouchers"));
const SellerOrders = lazy(() => import("./seller/pages/Orders"));
const SellerLogistics = lazy(() => import("./seller/pages/Logistics"));
const SellerFeedback = lazy(() => import("./seller/pages/Feedback"));
const SellerReports = lazy(() => import("./seller/pages/Reports"));
const SellerReturns = lazy(() => import("./seller/pages/Returns"));
const SellerChat = lazy(() => import("./seller/pages/Chat"));
const SellerAccountSettings = lazy(() => import("./seller/pages/AccountSettings"));
const AdminVouchers = lazy(() => import("./admin/pages/Vouchers/Vouchers"));
const LogisticsLayout = lazy(() => import("./logistics/layouts/LogisticsLayout"));
const LogisticsDashboard = lazy(() => import("./logistics/pages/Dashboard"));
const LogisticsReports = lazy(() => import("./logistics/pages/Reports"));
const RiderManagement = lazy(() => import("./logistics/pages/RiderManagement"));
const ParcelOperations = lazy(() => import("./logistics/pages/ParcelOperations"));
const LogisticsProfile = lazy(() => import("./logistics/pages/Profile"));
const LogisticsAccountSettings = lazy(() => import("./logistics/pages/AccountSettings"));
const HubStaffLayout = lazy(() => import("./hubStaff/HubStaffLayout"));
const HubStaffOverview = lazy(() => import("./hubStaff/pages/Overview"));
const HubStaffParcels = lazy(() => import("./hubStaff/pages/Parcels"));
const HubStaffPickupReceiving = lazy(() => import("./hubStaff/pages/PickupReceiving"));
const HubStaffIncomingTransfers = lazy(() => import("./hubStaff/pages/IncomingTransfers"));
const HubStaffOutgoingTransfers = lazy(() => import("./hubStaff/pages/OutgoingTransfers"));
const HubStaffActivity = lazy(() => import("./hubStaff/pages/Activity"));


function App() {
    return (
        <BrowserRouter>
            <GlobalNetworkLoadingIndicator />
            <Suspense fallback={<div className="app-route-loading" role="status"><span className="app-route-loading__mark"><img src="/cryma-logo.png" alt="" /></span><span>Loading CRYMA…</span></div>}>
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
                <Route path="/verify-email" element={<EmailVerification />} />
                <Route path="/application/document-correction" element={<DocumentCorrection />} />

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
                        element={isBuyerSession() ? <Navigate to="/shop" replace /> : <Suspense fallback={<div className="app-route-loading" role="status"><span className="app-route-loading__mark"><img src="/cryma-logo.png" alt="" /></span><span>Loading CRYMA…</span></div>}><BuyerHome /></Suspense>}
                    />

                    <Route
                        path="/shop"
                        element={<BuyerCategories />}
                    />

                    <Route path="/stores/:slug" element={<PublicStorefront />} />

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
                            element={<SellerChatRedirect />}
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

                        <Route path="refund-requests" element={<AdminRefundRequests />} />
                        <Route path="settlements" element={<Navigate to="/admin/finance?view=settlements" replace />} />
                        <Route path="parcel-flow" element={<AdminParcelFlow />} />
                        <Route path="hub-staff" element={<HubStaffManagement />} />

                        <Route path="commission" element={<Navigate to="/admin/finance?view=commission" replace />} />
                        <Route path="finance" element={<AdminFinance />} />

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

                        <Route path="vouchers" element={<SellerVouchers />} />

                        <Route
                            path="storefront"
                            element={<SellerStorefront />}
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

                        <Route path="earnings" element={<Navigate to="/seller/reports?view=earnings" replace />} />
                        <Route path="returns" element={<SellerReturns />} />

                        <Route
                            path="chat"
                            element={<SellerChat />}
                        />
                        <Route path="delivery-chats" element={<DeliveryMessages mode="seller" />} />

                        <Route
                            path="account-settings"
                            element={<SellerAccountSettings />}
                        />

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
                        <Route path="parcel-flow" element={<AdminParcelFlow base="/logistics" />} />
                        <Route path="hub-staff" element={<HubStaffManagement base="/logistics" />} />
                        <Route path="delivery-assignment" element={<ParcelOperations section="assignment" />} />
                        <Route path="delivery-monitoring" element={<ParcelOperations section="monitoring" />} />
                        <Route path="reports" element={<LogisticsReports />} />
                        <Route path="messages" element={<DeliveryMessages mode="logistics" />} />
                        <Route path="profile" element={<LogisticsProfile />} />
                        <Route path="settings" element={<LogisticsAccountSettings />} />
                        <Route path="account" element={<Navigate to="/logistics/profile" replace />} />
                    </Route>
                </Route>

                {/* HUB STAFF - HUB-SCOPED OPERATIONS ONLY */}
                <Route element={<ProtectedRoute allowedRoles={["hub_staff"]} />}>
                    <Route path="/hub-staff" element={<Suspense fallback={<div className="app-route-loading" role="status">Loading Hub Staff workspace…</div>}><HubStaffLayout /></Suspense>}>
                        <Route index element={<Navigate to="/hub-staff/overview" replace />} />
                        <Route path="overview" element={<HubStaffOverview />} />
                        <Route path="parcels" element={<HubStaffParcels />} />
                        <Route path="pickup-receiving" element={<HubStaffPickupReceiving />} />
                        <Route path="incoming-transfers" element={<HubStaffIncomingTransfers />} />
                        <Route path="outgoing-transfers" element={<HubStaffOutgoingTransfers />} />
                        <Route path="activity" element={<HubStaffActivity />} />
                        <Route path="messages" element={<DeliveryMessages mode="hubStaff" />} />
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
            </Suspense>
        </BrowserRouter>
    );
}

export default App;
