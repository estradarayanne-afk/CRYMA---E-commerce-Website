import { useCallback, useEffect, useState } from "react";
import api from "../../../shared/services/api";
import "./Commission.css";

function Commission() {
    const [commissions, setCommissions] = useState([]);
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

    const [selectedCommission, setSelectedCommission] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const fetchCommissions = useCallback(async (page = 1) => {
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
                "/admin/commissions",
                { params }
            );

            const data = response.data.data;

            setCommissions(data?.data || []);
            setPagination({
                current_page: data?.current_page || 1,
                last_page: data?.last_page || 1,
                per_page: data?.per_page || 10,
                total: data?.total || 0,
            });
        } catch (err) {
            console.error(
                "Commission API error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load commission records."
            );
        } finally {
            setLoading(false);
        }
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchCommissions();
        }, 0);

        return () => clearTimeout(timeoutId);
    }, [fetchCommissions]);

    const getSellerName = (commission) => {
        const seller = commission.seller;

        if (!seller) {
            return "Unknown Seller";
        }

        return [
            seller.first_name,
            seller.middle_name,
            seller.last_name,
        ]
            .filter(Boolean)
            .join(" ") || "Unknown Seller";
    };

    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case "paid":
                return "paid";

            case "completed":
                return "completed";

            case "cancelled":
            case "rejected":
                return "cancelled";

            default:
                return "pending";
        }
    };

    const formatCurrency = (amount) => {
        return `₱${Number(amount || 0).toLocaleString(
            "en-PH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        )}`;
    };

    const handleViewCommission = async (commission) => {
        setSelectedCommission(commission);
        setDetailsLoading(true);
        setError("");

        try {
            const response = await api.get(
                `/admin/commissions/${commission.id}`
            );

            setSelectedCommission(
                response.data.data
            );
        } catch (err) {
            console.error(
                "Commission details error:",
                err
            );

            setError(
                err.response?.data?.message ||
                "Unable to load commission details."
            );
        } finally {
            setDetailsLoading(false);
        }
    };

    const closeDetailsModal = () => {
        setSelectedCommission(null);
        setError("");
    };

    return (
        <div className="commission-page">

            {/* HEADER */}

            <div className="commission-header">

                <div>
                    <span className="commission-eyebrow">
                        FINANCIAL MANAGEMENT
                    </span>

                    <h1>
                        Commissions
                    </h1>

                    <p>
                        Monitor seller commissions and earnings.
                    </p>
                </div>

                <div className="commission-count">

                    <strong>
                        {pagination.total}
                    </strong>

                    <span>
                        Records
                    </span>

                </div>

            </div>


            {/* ERROR */}

            {error && (
                <div className="commission-error">
                    {error}
                </div>
            )}


            {/* MAIN CARD */}

            <div className="commission-card">

                {/* TOOLBAR */}

                <div className="commission-toolbar">

                    <div className="commission-search">

                        <span>
                            ⌕
                        </span>

                        <input
                            type="text"
                            placeholder="Search seller..."
                            value={searchTerm}
                            onChange={(event) =>
                                setSearchTerm(
                                    event.target.value
                                )
                            }
                        />

                    </div>


                    <div className="commission-filter">

                        <label htmlFor="commission-status">
                            Status
                        </label>

                        <select
                            id="commission-status"
                            value={statusFilter}
                            onChange={(event) =>
                                setStatusFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                All Status
                            </option>

                            <option value="pending">
                                Pending
                            </option>

                            <option value="paid">
                                Paid
                            </option>

                            <option value="completed">
                                Completed
                            </option>

                            <option value="cancelled">
                                Cancelled
                            </option>
                        </select>

                    </div>

                </div>


                {/* TABLE */}

                {loading ? (

                    <div className="commission-loading">
                        Loading commission records...
                    </div>

                ) : (
                    <>
                    <div className="commission-table-wrapper">

                        <table className="commission-table">

                            <thead>

                                <tr>

                                    <th>
                                        Seller
                                    </th>

                                    <th>
                                        Order
                                    </th>

                                    <th>
                                        Order Amount
                                    </th>

                                    <th>
                                        Commission
                                    </th>

                                    <th>
                                        Seller Earnings
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Action
                                    </th>

                                </tr>

                            </thead>

                            <tbody>

                                {commissions.length === 0 ? (

                                    <tr>

                                        <td
                                            colSpan="7"
                                            className="commission-empty"
                                        >
                                            No commission records found.
                                        </td>

                                    </tr>

                                ) : (

                                    commissions.map(
                                        (commission) => (

                                            <tr
                                                key={
                                                    commission.id
                                                }
                                            >

                                                {/* SELLER */}

                                                <td>

                                                    <strong>
                                                        {getSellerName(
                                                            commission
                                                        )}
                                                    </strong>

                                                </td>


                                                {/* ORDER */}

                                                <td>

                                                    #{commission.order_id}

                                                </td>


                                                {/* ORDER AMOUNT */}

                                                <td>

                                                    {formatCurrency(
                                                        commission.order_amount
                                                    )}

                                                </td>


                                                {/* COMMISSION */}

                                                <td>

                                                    <div className="commission-amount">

                                                        <strong>
                                                            {formatCurrency(
                                                                commission.commission_amount
                                                            )}
                                                        </strong>

                                                        <span>
                                                            {commission.commission_rate}% 
                                                        </span>

                                                    </div>

                                                </td>


                                                {/* SELLER EARNINGS */}

                                                <td>

                                                    <strong>
                                                        {formatCurrency(
                                                            commission.seller_earnings
                                                        )}
                                                    </strong>

                                                </td>


                                                {/* STATUS */}

                                                <td>

                                                    <span
                                                        className={`commission-status ${getStatusClass(
                                                            commission.status
                                                        )}`}
                                                    >

                                                        <span />

                                                        {commission.status ||
                                                            "Pending"}

                                                    </span>

                                                </td>


                                                {/* ACTION */}

                                                <td>

                                                    <button
                                                        type="button"
                                                        className="commission-view-button"
                                                        onClick={() =>
                                                            handleViewCommission(
                                                                commission
                                                            )
                                                        }
                                                    >
                                                        View
                                                    </button>

                                                </td>

                                            </tr>

                                        )
                                    )

                                )}

                            </tbody>

                        </table>

                    </div>

                    {pagination.total > 0 && (
                        <Pagination
                            pagination={pagination}
                            onPageChange={fetchCommissions}
                        />
                    )}
                    </>
                )}

            </div>


            {/* DETAILS MODAL */}

            {selectedCommission && (

                <div
                    className="commission-modal-overlay"
                    onClick={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeDetailsModal();
                        }

                    }}
                >

                    <div
                        className="commission-modal"
                        onClick={(event) =>
                            event.stopPropagation()
                        }
                    >

                        {/* MODAL HEADER */}

                        <div className="commission-modal-header">

                            <div>

                                <span>
                                    COMMISSION DETAILS
                                </span>

                                <h2>
                                    Commission #{selectedCommission.id}
                                </h2>

                            </div>

                            <button
                                type="button"
                                onClick={
                                    closeDetailsModal
                                }
                            >
                                ×
                            </button>

                        </div>


                        {detailsLoading ? (

                            <div className="commission-loading">
                                Loading commission details...
                            </div>

                        ) : (

                            <>

                                {/* SELLER */}

                                <section className="commission-detail-section">

                                    <h4>
                                        Seller Information
                                    </h4>

                                    <div className="commission-detail-grid">

                                        <div>
                                            <span>
                                                Seller
                                            </span>

                                            <strong>
                                                {getSellerName(
                                                    selectedCommission
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Seller ID
                                            </span>

                                            <strong>
                                                #{selectedCommission.seller_id}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Email
                                            </span>

                                            <strong>
                                                {selectedCommission
                                                    .seller
                                                    ?.email ||
                                                    "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Status
                                            </span>

                                            <strong>
                                                {selectedCommission.status ||
                                                    "Pending"}
                                            </strong>
                                        </div>

                                    </div>

                                </section>


                                {/* ORDER */}

                                <section className="commission-detail-section">

                                    <h4>
                                        Order Information
                                    </h4>

                                    <div className="commission-detail-grid">

                                        <div>
                                            <span>
                                                Order ID
                                            </span>

                                            <strong>
                                                #{selectedCommission.order_id}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Order Amount
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedCommission.order_amount
                                                )}
                                            </strong>
                                        </div>

                                    </div>

                                </section>


                                {/* COMMISSION BREAKDOWN */}

                                <section className="commission-detail-section">

                                    <h4>
                                        Commission Breakdown
                                    </h4>

                                    <div className="commission-breakdown">

                                        <div>
                                            <span>
                                                Order Amount
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedCommission.order_amount
                                                )}
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Commission Rate
                                            </span>

                                            <strong>
                                                {selectedCommission.commission_rate}%
                                            </strong>
                                        </div>

                                        <div>
                                            <span>
                                                Commission Amount
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedCommission.commission_amount
                                                )}
                                            </strong>
                                        </div>

                                        <div className="commission-total">

                                            <span>
                                                Seller Earnings
                                            </span>

                                            <strong>
                                                {formatCurrency(
                                                    selectedCommission.seller_earnings
                                                )}
                                            </strong>

                                        </div>

                                    </div>

                                </section>


                                <div className="commission-modal-footer">

                                    <button
                                        type="button"
                                        className="commission-done-button"
                                        onClick={
                                            closeDetailsModal
                                        }
                                    >
                                        Done
                                    </button>

                                </div>

                            </>

                        )}

                    </div>

                </div>

            )}

        </div>
    );
}

function Pagination({ pagination, onPageChange }) {
    return (
        <div className="commission-pagination">
            <div className="commission-pagination-info">
                Showing <strong>{(pagination.current_page - 1) * pagination.per_page + 1}</strong> – <strong>{Math.min(pagination.current_page * pagination.per_page, pagination.total)}</strong> of <strong>{pagination.total}</strong>
            </div>
            <div className="commission-pagination-controls">
                <button type="button" className="commission-pagination-button" disabled={pagination.current_page === 1} onClick={() => onPageChange(pagination.current_page - 1)}>← Previous</button>
                <div className="commission-pagination-pages">
                    {Array.from({ length: pagination.last_page }, (_, index) => index + 1).map((page) => (
                        <button type="button" key={page} className={`commission-pagination-page ${page === pagination.current_page ? "active" : ""}`} onClick={() => onPageChange(page)}>{page}</button>
                    ))}
                </div>
                <button type="button" className="commission-pagination-button" disabled={pagination.current_page === pagination.last_page} onClick={() => onPageChange(pagination.current_page + 1)}>Next →</button>
            </div>
        </div>
    );
}

export default Commission;
