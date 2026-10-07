import { Link } from "react-router-dom";
import { LANDING_VISUALS } from "../../shared/constants/landingVisuals";
import AuthShell from "../components/AuthShell";
import "../styles/AuthPages.css";
import "./BuyerLogin.css";
import "./RegistrationChoice.css";

const roles = [
    { key: "buyer", title: "Buyer", description: "Shop from trusted CRYMA sellers and manage your orders.", visual: LANDING_VISUALS.hero },
    { key: "seller", title: "Seller", description: "List your products and reach customers across the marketplace.", visual: LANDING_VISUALS.sellerRegistration },
    { key: "rider", title: "Courier", description: "Deliver orders and work with CRYMA’s logistics system.", visual: LANDING_VISUALS.logistics },
];

function RoleChoices({ embedded = false, onChooseRole }) {
    return (
        <div className="registration-choices">
            {roles.map((role) => {
                const content = (
                    <>
                        <img src={role.visual.src} alt="" loading="lazy" />
                        <span className="registration-choice-content">
                            <strong>{role.title}</strong>
                            <span>{role.description}</span>
                            <span className="registration-choice-cta">Continue as {role.title}</span>
                        </span>
                        <span className="registration-choice-arrow" aria-hidden="true">→</span>
                    </>
                );

                return embedded ? (
                    <button className="registration-choice" type="button" key={role.key} onClick={() => onChooseRole?.(role.key)}>{content}</button>
                ) : (
                    <Link className="registration-choice" to={`/register/${role.key}`} state={{ accountTypeSelected: true }} key={role.key}>{content}</Link>
                );
            })}
        </div>
    );
}

function RegistrationChoice({ embedded = false, onChooseRole }) {
    const content = embedded ? (
        <section className="registration-choice-panel">
            <span className="registration-choice-eyebrow">CRYMA ACCOUNT</span>
            <h2>Choose your CRYMA account type</h2>
            <RoleChoices embedded onChooseRole={onChooseRole} />
        </section>
    ) : (
        <section className="buyer-login-form-section auth-choice-content">
                <div className="buyer-login-form-wrap">
                    <Link to="/" className="buyer-login-back">← Back to store</Link>
                    <div className="buyer-login-heading">
                        <span className="buyer-login-mobile-logo">C</span>
                        <h1>Create your CRYMA account</h1>
                        <p>How would you like to use CRYMA?</p>
                    </div>
                    <RoleChoices />
                    <p className="auth-switch">Already have an account? <Link to="/login">Sign in</Link></p>
                </div>
        </section>
    );
    return embedded ? content : <AuthShell visualProps={{ visual: LANDING_VISUALS.hero }}>{content}</AuthShell>;
}

export default RegistrationChoice;
