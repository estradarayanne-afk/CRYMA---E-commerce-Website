import { Link } from "react-router-dom";

const roles = [
    {
        key: "buyer",
        title: "Buyer",
        description: "Shop from trusted CRYMA sellers and manage your orders.",
    },
    {
        key: "seller",
        title: "Seller",
        description: "List your products and reach customers across the marketplace.",
    },
    {
        key: "logistics",
        title: "Logistics partner",
        description: "Deliver orders and help keep every purchase moving.",
    },
];

function RegistrationChoice() {
    return (
        <div className="auth-root auth-root--wide">
            <div className="auth-left">
                <Link to="/" className="auth-logo">CRYMA<sup>®</sup></Link>
                <div className="auth-left-body">
                    <h2>Join CRYMA.</h2>
                    <p>Choose how you want to take part in the marketplace.</p>
                </div>
                <span className="auth-left-copy">© 2026 Cryma</span>
            </div>

            <div className="auth-right">
                <div className="auth-box">
                    <div className="auth-box-head">
                        <h1>Create an account</h1>
                        <p>How would you like to use CRYMA?</p>
                    </div>

                    <div className="registration-choices">
                        {roles.map((role) => (
                            <Link className="registration-choice" to={`/register/${role.key}`} key={role.key}>
                                <span className="registration-choice-arrow">→</span>
                                <strong>{role.title}</strong>
                                <span>{role.description}</span>
                            </Link>
                        ))}
                    </div>

                    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
                </div>
            </div>
        </div>
    );
}

export default RegistrationChoice;
