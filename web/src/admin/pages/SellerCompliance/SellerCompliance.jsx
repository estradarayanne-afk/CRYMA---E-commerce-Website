import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./SellerCompliance.css";

function SellerCompliance() {
    const [sellers, setSellers] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [selectedSeller, setSelectedSeller] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const [actionLoading, setActionLoading] = useState(false);

    // Modal states
    const [actionModal, setActionModal] = useState(null);
    const [rejectionReason, setRejectionReason] = useState("");
    const [violationReason, setViolationReason] = useState("");
    const [selectedComplianceProduct, setSelectedComplianceProduct] = useState(null);
    const [successModal, setSuccessModal] = useState("");

    const openDocument = async (documentId) => {
        const documentWindow = window.open("about:blank", "_blank");
        if (!documentWindow) {
            setError("Allow pop-ups to view submitted documents.");
            return;
        }

        try {
            const response = await api.get(`/admin/documents/${documentId}`, {
                responseType: "blob",
            });
            const documentUrl = URL.createObjectURL(response.data);

            documentWindow.location.href = documentUrl;

            window.setTimeout(() => URL.revokeObjectURL(documentUrl), 60_000);
        } catch (err) {
            documentWindow?.close();
            setError(err.response?.data?.message || "Unable to open this document.");
        }
    };

    // =========================================
    // FETCH SELLERS
    // =========================================

    const fetchSellers = useCallback(async (page = 1) => {
        setLoading(true);
        setError("");

        try {
            const params = {};

            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }

            if (statusFilter !== "all") {
                params.status = statusFilter;
            }

            params.page = page;

            const response = await api.get(
                "/admin/seller-compliance",
                {
                    params,
                }
            );

            const data = response.data.data;

            setSellers(data?.data || []);
            setPagination({
                current_page: data?.current_page || 1,
                last_page: data?.last_page || 1,
                per_page: data?.per_page || 10,
                total: data?.total || 0,
            });
        } catch (err) {
            console.error(
                "Seller compliance API error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load seller compliance records."
            );
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchSellers();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [fetchSellers]);

    // =========================================
    // HELPERS
    // =========================================

    const getFullName = (seller) => {
        return [
            seller.first_name,
            seller.middle_name,
            seller.last_name,
        ]
            .filter(Boolean)
            .join(" ") || "Unnamed Seller";
    };

    const getInitials = (seller) => {
        const initials =
            `${seller.first_name?.[0] || ""}${seller.last_name?.[0] || ""}`;

        return initials.toUpperCase() || "S";
    };

    const getStatusClass = (status) => {
        const normalized = status?.toLowerCase();

        if (normalized === "active") {
            return "active";
        }

        if (
            normalized === "rejected" ||
            normalized === "suspended"
        ) {
            return "inactive";
        }

        return "pending";
    };

    const getStatusLabel = (status) => {
        const normalized = (status || "unknown").toLowerCase();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };

    const getComplianceClass = (status) => status === "compliant" ? "compliant" : status === "suspended" ? "suspended" : status === "review_queue" ? "flagged" : "pending";

    // =========================================
    // VIEW SELLER DETAILS
    // =========================================

    const handleViewSeller = async (seller) => {
        setSelectedSeller(seller);
        setDetailsLoading(true);
        setError("");

        try {
            const response = await api.get(
                `/admin/seller-compliance/${seller.id}`
            );

            setSelectedSeller(response.data.data);
        } catch (err) {
            console.error(
                "Seller details error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load seller details."
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    // =========================================
    // CLOSE SELLER DETAILS
    // =========================================

    const closeSellerDetails = () => {
        if (actionLoading) return;

        setSelectedSeller(null);
        setError("");
    };

    // =========================================
    // OPEN APPROVE MODAL
    // =========================================

    const openApproveModal = () => {
        if (!selectedSeller || actionLoading) return;

        setError("");
        setActionModal("approve");
    };

    // =========================================
    // OPEN REJECT MODAL
    // =========================================

    const openRejectModal = () => {
        if (!selectedSeller || actionLoading) return;

        setError("");
        setRejectionReason("");
        setActionModal("reject");
    };

    const openViolationModal = (action, product) => {
        if (!selectedSeller || actionLoading) return;
        setError("");
        setViolationReason("");
        setSelectedComplianceProduct(product);
        setActionModal(action);
    };

    const openProductDecisionModal = (decision, product) => {
        if (!selectedSeller || actionLoading) return;
        setError("");
        setViolationReason("");
        setSelectedComplianceProduct(product);
        setActionModal(decision === "approve" ? "product_approve" : "product_reject");
    };

    // =========================================
    // CLOSE ACTION MODAL
    // =========================================

    const closeActionModal = () => {
        if (actionLoading) return;

        setActionModal(null);
        setRejectionReason("");
        setViolationReason("");
        setSelectedComplianceProduct(null);
        setError("");
    };

    const confirmViolationAction = async () => {
        if (!selectedSeller || !["warning", "suspension"].includes(actionModal) || actionLoading) return;
        if (!violationReason.trim()) {
            setError("Please provide a reason for this compliance action.");
            return;
        }

        setActionLoading(true);
        setError("");
        try {
            const response = await api.post(`/admin/seller-compliance/${selectedSeller.id}/violation-action`, {
                action: actionModal,
                product_id: selectedComplianceProduct?.id,
                reason: violationReason.trim(),
            });
            const { seller, action } = response.data.data;
            setSellers((current) => current.map((item) => item.id === seller.id ? { ...item, ...seller } : item));
            setSelectedSeller((current) => ({
                ...current,
                ...seller,
                seller_compliance_actions: [action, ...(current.seller_compliance_actions || [])],
            }));
            setActionModal(null);
            setViolationReason("");
            setSelectedComplianceProduct(null);
            setSuccessModal(response.data.message || "Compliance action recorded.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to record the compliance action.");
        } finally {
            setActionLoading(false);
        }
    };

    const confirmProductDecision = async () => {
        if (!selectedSeller || !selectedComplianceProduct || actionLoading) return;
        const decision = actionModal === "product_approve" ? "approve" : "reject";
        if (decision === "reject" && !violationReason.trim()) {
            setError("Add a reason before rejecting this product.");
            return;
        }
        setActionLoading(true);
        setError("");
        try {
            const response = await api.patch(`/admin/seller-compliance/${selectedSeller.id}/products/${selectedComplianceProduct.id}/review`, {
                decision,
                reason: violationReason.trim() || undefined,
            });
            setSelectedSeller((current) => ({
                ...current,
                products: (current.products || []).filter((product) => product.id !== selectedComplianceProduct.id),
            }));
            setActionModal(null);
            setViolationReason("");
            setSelectedComplianceProduct(null);
            fetchSellers(pagination.current_page);
            setSuccessModal(response.data.message || "Product review decision saved.");
        } catch (err) {
            setError(err.response?.data?.message || "Unable to save the product review decision.");
        } finally {
            setActionLoading(false);
        }
    };

    // =========================================
    // APPROVE SELLER
    // =========================================

    const confirmApprove = async () => {
        if (!selectedSeller || actionLoading) return;

        setActionLoading(true);
        setError("");

        try {
            const response = await api.patch(
                `/admin/seller-compliance/${selectedSeller.id}/approve`
            );

            const updatedSeller = response.data.data;

            // Update seller in table
            setSellers((current) =>
                current.map((seller) =>
                    seller.id === updatedSeller.id
                        ? {
                            ...seller,
                            ...updatedSeller,
                        }
                        : seller
                )
            );

            // Update seller details
            setSelectedSeller((current) => ({
                ...current,
                ...updatedSeller,
            }));

            // Close action modal
            setActionModal(null);

            // Show success modal
            setSuccessModal(
                response.data.message ||
                "Seller compliance approved successfully."
            );
        } catch (err) {
            console.error(
                "Approve seller error:",
                err
            );

            setActionModal(null);

            setError(
                err.response?.data?.message ||
                "Unable to approve seller."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // =========================================
    // REJECT SELLER
    // =========================================

    const confirmReject = async () => {
        if (!selectedSeller || actionLoading) return;

        if (!rejectionReason.trim()) {
            setError(
                "Please provide a rejection reason."
            );

            return;
        }

        setActionLoading(true);
        setError("");

        try {
            const response = await api.patch(
                `/admin/seller-compliance/${selectedSeller.id}/reject`,
                {
                    rejection_reason:
                        rejectionReason.trim(),
                }
            );

            const updatedSeller =
                response.data.data.seller;

            // Update seller in table
            setSellers((current) =>
                current.map((seller) =>
                    seller.id === updatedSeller.id
                        ? {
                            ...seller,
                            ...updatedSeller,
                        }
                        : seller
                )
            );

            // Update seller details
            setSelectedSeller((current) => ({
                ...current,
                ...updatedSeller,
            }));

            // Close action modal
            setActionModal(null);
            setRejectionReason("");

            // Show success modal
            setSuccessModal(
                response.data.message ||
                "Seller compliance rejected successfully."
            );
        } catch (err) {
            console.error(
                "Reject seller error:",
                err
            );

            setActionModal(null);

            setError(
                err.response?.data?.message ||
                "Unable to reject seller."
            );
        } finally {
            setActionLoading(false);
        }
    };

    // =========================================
    // CLOSE SUCCESS MODAL
    // =========================================

    const closeSuccessModal = () => {
        setSuccessModal("");
    };

    // =========================================
    // RETURN
    // =========================================

    return (
        <div className="seller-compliance-page">

            {/* =========================================
                HEADER
            ========================================= */}

            <div className="seller-compliance-header">

                <div>

                    <span className="seller-compliance-eyebrow">
                        SELLER MANAGEMENT
                    </span>

                    <h1>
                        Seller Compliance
                    </h1>

                    <p>
                        Review and manage seller account compliance.
                    </p>

                </div>

                <div className="seller-compliance-count">

                    <strong>
                        {pagination.total}
                    </strong>

                    <span>
                        Sellers
                    </span>

                </div>

            </div>


            {/* =========================================
                ERROR MESSAGE
            ========================================= */}

            {error && (
                <div className="seller-compliance-error">
                    {error}
                </div>
            )}


            {/* =========================================
                MAIN CARD
            ========================================= */}

            <div className="seller-compliance-card">

                {/* TOOLBAR */}

                <div className="seller-compliance-toolbar">

                    <div className="seller-compliance-filter">
                        {[
                            ["all", "All Status"],
                            ["pending", "Pending"],
                            ["active", "Active"],
                            ["rejected", "Rejected"],
                            ["suspended", "Suspended"],
                        ].map(([status, label]) => (
                            <button
                                key={status}
                                type="button"
                                className={statusFilter === status ? "active" : ""}
                                aria-pressed={statusFilter === status}
                                onClick={() => setStatusFilter(status)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    <label className="seller-compliance-search">
                        <span className="seller-search-icon" aria-hidden="true" />
                        <input
                            type="search"
                            aria-label="Search sellers"
                            placeholder="Search seller name, email, or phone"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                        {searchTerm && (
                            <button
                                type="button"
                                className="seller-search-clear"
                                aria-label="Clear search"
                                onClick={() => setSearchTerm("")}
                            >x</button>
                        )}
                    </label>

                </div>


                {/* =========================================
                    TABLE
                ========================================= */}

                {loading ? (

                    <div className="seller-compliance-loading">
                        Loading seller compliance records...
                    </div>

                ) : (
                    <>
                    <div className="seller-compliance-table-wrapper">

                        <table className="seller-compliance-table">

                            <thead>

                                <tr>

                                    <th>
                                        Seller
                                    </th>

                                    <th>
                                        Business
                                    </th>

                                    <th>
                                        Email
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Registered
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {sellers.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="6"
                                            className="seller-compliance-empty"
                                        >
                                            No seller records found.
                                        </td>

                                    </tr>

                                ) : (

                                    sellers.map((seller) => (

                                        <tr className="seller-row" key={seller.id}>

                                            {/* SELLER */}

                                            <td>

                                                <div className="seller-info">

                                                    <div className="seller-avatar" style={{ "--avatar-hue": (Number(seller.id) * 67) % 360 }}>

                                                        {getInitials(
                                                            seller
                                                        )}

                                                    </div>

                                                    <div>

                                                        <strong>
                                                            {getFullName(
                                                                seller
                                                            )}
                                                        </strong>

                                                        <span>
                                                            ID #{seller.id}
                                                        </span>

                                                    </div>

                                                </div>

                                            </td>


                                            {/* BUSINESS */}

                                            <td className="seller-business-cell">

                                                <strong>{seller
                                                    .seller_profile
                                                    ?.business_name ||
                                                    "—"}</strong>
                                                <span className="seller-business-category">{seller.seller_profile?.line_of_business || "Category not set"}</span>

                                            </td>


                                            {/* EMAIL */}

                                            <td className="seller-email-cell">

                                                {seller.email ||
                                                    "—"}

                                            </td>


                                            {/* STATUS */}

                                            <td>

                                                <span className={`seller-compliance-badge ${getComplianceClass(seller.compliance_status)}`}>
                                                    <span />
                                                    {seller.compliance_status === "review_queue"
                                                        ? `${seller.pending_products_count} New Product${seller.pending_products_count === 1 ? "" : "s"}`
                                                        : seller.compliance_status === "compliant"
                                                            ? "Compliant"
                                                            : getStatusLabel(seller.compliance_status)}

                                                </span>

                                            </td>


                                            {/* REGISTERED */}

                                            <td>

                                                {seller.created_at
                                                    ? new Date(
                                                        seller.created_at
                                                    ).toLocaleDateString()
                                                    : "—"}

                                            </td>


                                            {/* ACTION */}

                                            <td>

                                                <button
                                                    type="button"
                                                    className="seller-view-button"
                                                    onClick={() =>
                                                        handleViewSeller(
                                                            seller
                                                        )
                                                    }
                                                >
                                                    View Details
                                                </button>

                                            </td>

                                        </tr>

                                    ))

                                )}

                            </tbody>

                        </table>

                    </div>

                    {pagination.total > 0 && (
                        <Pagination
                            pagination={pagination}
                            onPageChange={fetchSellers}
                        />
                    )}
                    </>
                )}

            </div>


            {/* =========================================
                SELLER DETAILS MODAL
            ========================================= */}

            {selectedSeller && (

                <div
                    className="seller-modal-overlay"
                    onClick={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeSellerDetails();
                        }

                    }}
                >

                    <div
                        className="seller-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* MODAL HEADER */}

                        <div className="seller-modal-header">

                            <div>

                                <span>
                                    SELLER COMPLIANCE
                                </span>

                                <h2>
                                    Seller Details
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeSellerDetails
                                }
                                disabled={actionLoading}
                            >
                                ×
                            </button>

                        </div>


                        {detailsLoading ? (

                            <div className="seller-compliance-loading">
                                Loading seller details...
                            </div>

                        ) : (

                            <>

                                {/* PROFILE */}

                                <div className="seller-profile">

                                    <div className="seller-profile-avatar" style={{ "--avatar-hue": (Number(selectedSeller.id) * 67) % 360 }}>

                                        {getInitials(
                                            selectedSeller
                                        )}

                                    </div>

                                    <div>

                                        <h3>
                                            {getFullName(
                                                selectedSeller
                                            )}
                                        </h3>

                                        <div className="seller-profile-badges">
                                            <span className={`seller-status ${getStatusClass(selectedSeller.status)}`}>
                                                <span />
                                                {getStatusLabel(selectedSeller.status)}
                                            </span>
                                        </div>

                                        <div className="seller-storefront-meta">
                                            <strong>{selectedSeller.seller_profile?.business_name || "Seller storefront"}</strong>
                                            <span>{selectedSeller.seller_profile?.line_of_business || "Business category not provided"}</span>
                                        </div>

                                    </div>

                                </div>


                                {/* =========================================
                                    ACCOUNT INFORMATION
                                ========================================= */}

                                <section className="seller-detail-section">

                                    <h4>
                                        Account Information
                                    </h4>

                                    <div className="seller-detail-grid">

                                        <div>

                                            <span><i aria-hidden="true">◈</i> Account ID</span>

                                            <strong>
                                                #{selectedSeller.id}
                                            </strong>

                                        </div>


                                        <div>

                                            <span><i aria-hidden="true">●</i> Status</span>

                                            <strong>
                                                {selectedSeller.status ||
                                                    "Unknown"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span><i aria-hidden="true">✉</i> Email</span>

                                            <strong>
                                                {selectedSeller.email ||
                                                    "—"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span><i aria-hidden="true">☎</i> Phone</span>

                                            <strong>
                                                {selectedSeller.phone ||
                                                    "—"}
                                            </strong>

                                        </div>

                                    </div>

                                </section>


                                {/* =========================================
                                    BUSINESS INFORMATION
                                ========================================= */}

                                <section className="seller-detail-section">

                                    <h4>
                                        Business Information
                                    </h4>

                                    <div className="seller-detail-grid">

                                        <div>

                                            <span>
                                                Business Name
                                            </span>

                                            <strong>
                                                {selectedSeller
                                                    .seller_profile
                                                    ?.business_name ||
                                                    "—"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Line of Business
                                            </span>

                                            <strong>
                                                {selectedSeller
                                                    .seller_profile
                                                    ?.line_of_business ||
                                                    "—"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Sex
                                            </span>

                                            <strong>
                                                {selectedSeller
                                                    .seller_profile
                                                    ?.sex ||
                                                    "—"}
                                            </strong>

                                        </div>


                                        <div>

                                            <span>
                                                Birthday
                                            </span>

                                            <strong>
                                                {selectedSeller
                                                    .seller_profile
                                                    ?.birthday
                                                    ? new Date(
                                                        selectedSeller
                                                            .seller_profile
                                                            .birthday
                                                    ).toLocaleDateString()
                                                    : "—"}
                                            </strong>

                                        </div>

                                    </div>

                                </section>


                                <section className="seller-detail-section">
                                    <h4>New Product Submissions</h4>
                                    <p className="seller-compliance-category-note">
                                        Registered category: <strong>{selectedSeller.seller_profile?.line_of_business || "Not provided"}</strong>
                                        <span>Only new or materially edited listings appear here. Approve legitimate products to publish them, or reject listings that appear fraudulent or inappropriate.</span>
                                    </p>
                                    {selectedSeller.products?.length ? (
                                        <div className="seller-compliance-products">
                                            {selectedSeller.products.map((product) => {
                                                const previewImage = product.media?.find((media) => media.type === "image")?.url;
                                                return <article className={`seller-compliance-product ${product.compliance?.is_flagged ? "is-flagged" : ""}`} key={product.id}>
                                                    {product.compliance?.is_flagged && (
                                                        <div className="seller-product-alert-header">
                                                            <span aria-hidden="true">⚠</span>
                                                            {product.compliance.findings.length} REVIEW FLAG{product.compliance.findings.length === 1 ? "" : "S"} · {product.compliance.findings.map((finding) => finding.type === "category_mismatch" ? "CATEGORY MISMATCH" : "RESTRICTED CONTENT").join(" / ")}
                                                        </div>
                                                    )}
                                                    <div className="seller-compliance-product-heading">
                                                        {previewImage ? <img className="seller-product-preview" src={previewImage} alt={product.name} /> : <div className="seller-product-preview seller-product-preview--empty" aria-hidden="true">◇</div>}
                                                        <div>
                                                            <strong>{product.name}</strong>
                                                            <span>{product.category} · {product.status?.replaceAll("_", " ") || "unknown status"}</span>
                                                            <small>₱{Number(product.discounted_price || product.price || 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })} · {product.stock} in stock</small>
                                                        </div>
                                                        <span className="seller-product-compliance-badge flagged">Pending admin review</span>
                                                    </div>
                                                    {product.description && <p className="seller-product-description">{product.description}</p>}
                                                    {product.compliance?.findings?.some((finding) => finding.type === "category_mismatch") && (
                                                        <div className="seller-product-category-comparison">
                                                            <span>Registered category<strong>{selectedSeller.seller_profile?.line_of_business || "Not provided"}</strong></span>
                                                            <b aria-hidden="true">→</b>
                                                            <span>Listed category<strong>{product.category}</strong></span>
                                                        </div>
                                                    )}
                                                    {product.compliance?.is_flagged && (
                                                        <ul className="seller-product-findings">
                                                            {product.compliance.findings.map((finding, index) => (
                                                                <li key={`${product.id}-${finding.type}-${index}`}>
                                                                    <strong>{finding.label}</strong><span>{finding.message}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    )}
                                                    {product.compliance?.is_flagged && (
                                                        <>
                                                            <div className="seller-product-flag-summary">
                                                                {product.compliance.findings.length} automated review signal{product.compliance.findings.length === 1 ? "" : "s"} detected. Please inspect the listing before deciding.
                                                            </div>
                                                            <div className="seller-product-actions">
                                                                <button type="button" className="seller-warning-button" onClick={() => openViolationModal("warning", product)} disabled={actionLoading}>Issue warning for this product</button>
                                                                {selectedSeller.status !== "suspended" && <button type="button" className="seller-suspend-button" onClick={() => openViolationModal("suspension", product)} disabled={actionLoading}>Suspend seller</button>}
                                                            </div>
                                                        </>
                                                    )}
                                                    <div className="seller-product-review-actions">
                                                        <button type="button" className="seller-product-approve-button" onClick={() => openProductDecisionModal("approve", product)} disabled={actionLoading}>Approve product</button>
                                                        <button type="button" className="seller-product-reject-button" onClick={() => openProductDecisionModal("reject", product)} disabled={actionLoading}>Reject product</button>
                                                    </div>
                                                </article>
                                            })}
                                        </div>
                                    ) : (
                                        <p className="seller-no-documents">No new product submissions are waiting for review.</p>
                                    )}
                                    {!!selectedSeller.seller_compliance_actions?.length && (
                                        <div className="seller-compliance-history">
                                            <h5>Compliance history</h5>
                                            {selectedSeller.seller_compliance_actions.map((item) => (
                                                <div key={item.id}>
                                                    <strong>{item.action === "warning" ? "Warning issued" : "Seller suspended"}</strong>
                                                    {item.findings?.map((finding) => <em key={`${item.id}-${finding.product_id}`}>{finding.product_name} · {finding.category}</em>)}
                                                    <span>{item.reason}</span>
                                                    <small>{new Date(item.created_at).toLocaleString()} · {item.admin ? `${item.admin.first_name || ""} ${item.admin.last_name || ""}`.trim() : "Administrator"}</small>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </section>

                                {/* =========================================
                                    SUBMITTED DOCUMENTS
                                ========================================= */}

                                <section className="seller-detail-section">

                                    <h4>
                                        Submitted Documents
                                    </h4>


                                    {selectedSeller.documents?.length ? (

                                        <div className="seller-documents">

                                            {selectedSeller.documents.map(
                                                (document) => (

                                                    <div
                                                        className="seller-document"
                                                        key={document.id}
                                                    >

                                                        <div>

                                                            <strong>
                                                                {document.document_type ||
                                                                    document.original_file_name ||
                                                                    "Document"}
                                                            </strong>

                                                            <span>
                                                                {document.status ||
                                                                    "Unknown"}
                                                            </span>

                                                        </div>


                                                        <button
                                                            type="button"
                                                            onClick={() => openDocument(document.id)}
                                                        >
                                                            View
                                                        </button>

                                                    </div>

                                                )
                                            )}

                                        </div>

                                    ) : (

                                        <p className="seller-no-documents">
                                            No documents submitted.
                                        </p>

                                    )}

                                </section>


                                {/* =========================================
                                    ACTION BUTTONS
                                ========================================= */}

                                {selectedSeller.status ===
                                    "pending" && (

                                    <div className="seller-modal-actions">

                                        <button
                                            type="button"
                                            className="seller-reject-button"
                                            onClick={
                                                openRejectModal
                                            }
                                            disabled={
                                                actionLoading
                                            }
                                        >
                                            Reject Seller
                                        </button>


                                        <button
                                            type="button"
                                            className="seller-approve-button"
                                            onClick={
                                                openApproveModal
                                            }
                                            disabled={
                                                actionLoading
                                            }
                                        >
                                            Approve Seller
                                        </button>

                                    </div>

                                )}

                            </>

                        )}

                    </div>

                </div>

            )}


            {/* =========================================
                APPROVE / REJECT ACTION MODAL
            ========================================= */}

            {actionModal && selectedSeller && (

                <div
                    className="seller-action-modal-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget &&
                            !actionLoading
                        ) {
                            closeActionModal();
                        }

                    }}
                >

                    <div
                        className="seller-action-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* ICON */}

                        <div
                            className={`seller-action-modal-icon ${
                                ["approve", "product_approve"].includes(actionModal)
                                    ? "seller-action-modal-icon--approve"
                                    : "seller-action-modal-icon--reject"
                            }`}
                        >
                            {actionModal ===
                            "approve"
                                ? "✓"
                                : "!"}
                        </div>


                        {/* TITLE */}

                        <h3>{actionModal === "approve" ? "Approve Seller?" : actionModal === "reject" ? "Reject Seller?" : actionModal === "product_approve" ? "Approve and publish product?" : actionModal === "product_reject" ? "Reject product submission?" : actionModal === "warning" ? "Issue Compliance Warning?" : "Suspend Seller?"}</h3>


                        {/* MESSAGE */}

                        <p>

                            {actionModal === "approve" ? (

                                <>
                                    Are you sure you want to
                                    approve{" "}

                                    <strong>
                                        {getFullName(
                                            selectedSeller
                                        )}
                                    </strong>
                                    ?
                                </>

                            ) : actionModal === "reject" ? (

                                <>
                                    Please provide a reason
                                    for rejecting{" "}

                                    <strong>
                                        {getFullName(
                                            selectedSeller
                                        )}
                                    </strong>
                                    .
                                </>

                            ) : ["product_approve", "product_reject"].includes(actionModal) ? (
                                <>
                                    {actionModal === "product_approve"
                                        ? <>Approve <strong>{selectedComplianceProduct?.name}</strong> and publish it to the storefront?</>
                                        : <>Provide a reason to reject <strong>{selectedComplianceProduct?.name}</strong>. The product will remain unavailable to buyers.</>}
                                </>
                            ) : (
                                <>
                                    {actionModal === "warning" ? "A compliance warning will be recorded for " : "This will suspend "}
                                    <strong>{getFullName(selectedSeller)}</strong>
                                    {selectedComplianceProduct && <> for the listing <strong>{selectedComplianceProduct.name}</strong></>}
                                    {actionModal === "warning" ? "." : " and block the seller account until it is restored by an administrator."}
                                </>
                            )}

                        </p>


                        {/* APPROVE NOTE */}

                        {actionModal ===
                            "approve" && (

                            <span className="seller-action-modal-note">

                                This seller will be approved
                                and allowed to operate as an
                                active seller.

                            </span>

                        )}


                        {/* REJECTION REASON */}

                        {actionModal ===
                            "reject" && (

                            <div className="seller-rejection-field">

                                <label htmlFor="rejection-reason">
                                    Rejection Reason
                                </label>

                                <textarea
                                    id="rejection-reason"
                                    rows="4"
                                    maxLength={500}
                                    required
                                    placeholder="Enter the reason for rejecting this seller..."
                                    value={
                                        rejectionReason
                                    }
                                    onChange={(event) =>
                                        setRejectionReason(
                                            event.target.value
                                        )
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                />

                            </div>

                        )}

                        {(actionModal === "warning" || actionModal === "suspension" || actionModal === "product_reject") && (
                            <div className="seller-rejection-field">
                                <label htmlFor="compliance-action-reason">{actionModal === "warning" ? "Warning reason" : actionModal === "suspension" ? "Suspension reason" : "Rejection reason"}</label>
                                <textarea
                                    id="compliance-action-reason"
                                    rows="4"
                                    maxLength={1000}
                                    required
                                    placeholder={actionModal === "product_reject" ? "Explain why this product is rejected (for example, suspected scam or inappropriate listing)..." : "Describe the policy violation and the corrective action required..."}
                                    value={violationReason}
                                    onChange={(event) => setViolationReason(event.target.value)}
                                    disabled={actionLoading}
                                />
                            </div>
                        )}


                        {/* ACTION BUTTONS */}

                        <div className="seller-action-modal-actions">

                            <button
                                type="button"
                                className="seller-action-cancel"
                                onClick={
                                    closeActionModal
                                }
                                disabled={
                                    actionLoading
                                }
                            >
                                Cancel
                            </button>


                            {actionModal === "approve" ? (

                                <button
                                    type="button"
                                    className="seller-action-confirm seller-action-confirm--approve"
                                    onClick={
                                        confirmApprove
                                    }
                                    disabled={
                                        actionLoading
                                    }
                                >

                                    {actionLoading
                                        ? "Approving..."
                                        : "Approve Seller"}

                                </button>

                            ) : actionModal === "reject" ? (

                                <button
                                    type="button"
                                    className="seller-action-confirm seller-action-confirm--reject"
                                    onClick={
                                        confirmReject
                                    }
                                    disabled={
                                        actionLoading ||
                                        !rejectionReason.trim()
                                    }
                                >

                                    {actionLoading
                                        ? "Rejecting..."
                                        : "Reject Seller"}

                                </button>

                            ) : actionModal === "product_approve" || actionModal === "product_reject" ? (
                                <button
                                    type="button"
                                    className={`seller-action-confirm ${actionModal === "product_approve" ? "seller-action-confirm--approve" : "seller-action-confirm--reject"}`}
                                    onClick={confirmProductDecision}
                                    disabled={actionLoading || (actionModal === "product_reject" && !violationReason.trim())}
                                >
                                    {actionLoading ? "Saving..." : actionModal === "product_approve" ? "Approve and publish" : "Reject product"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={`seller-action-confirm ${actionModal === "warning" ? "seller-action-confirm--warning" : "seller-action-confirm--reject"}`}
                                    onClick={confirmViolationAction}
                                    disabled={actionLoading || !violationReason.trim()}
                                >
                                    {actionLoading ? "Saving..." : actionModal === "warning" ? "Issue warning" : "Suspend seller"}
                                </button>
                            )}

                        </div>

                    </div>

                </div>

            )}


            {/* =========================================
                SUCCESS MODAL
            ========================================= */}

            {successModal && (

                <div
                    className="seller-modal-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeSuccessModal();
                        }

                    }}
                >

                    <div
                        className="seller-success-modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        <div className="seller-success-icon">
                            ✓
                        </div>

                        <h3>
                            Success
                        </h3>

                        <p>
                            {successModal}
                        </p>

                        <button
                            type="button"
                            className="seller-success-button"
                            onClick={
                                closeSuccessModal
                            }
                        >
                            Done
                        </button>

                    </div>

                </div>

            )}

        </div>
    );
}

function Pagination({ pagination, onPageChange }) {
    return (
        <div className="seller-compliance-pagination">
            <div className="seller-compliance-pagination-info">
                Showing <strong>{(pagination.current_page - 1) * pagination.per_page + 1}</strong> – <strong>{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> of <strong>{pagination.total}</strong>
            </div>
            <div className="seller-compliance-pagination-controls">
                <button type="button" className="seller-compliance-pagination-button" disabled={pagination.current_page === 1} onClick={() => onPageChange(pagination.current_page - 1)}>← Previous</button>
                <div className="seller-compliance-pagination-pages">
                    {Array.from({ length: pagination.last_page }, (_, index) => index + 1).map((page) => (
                        <button type="button" key={page} className={`seller-compliance-pagination-page ${page === pagination.current_page ? "active" : ""}`} onClick={() => onPageChange(page)}>{page}</button>
                    ))}
                </div>
                <button type="button" className="seller-compliance-pagination-button" disabled={pagination.current_page === pagination.last_page} onClick={() => onPageChange(pagination.current_page + 1)}>Next →</button>
            </div>
        </div>
    );
}

export default SellerCompliance;
