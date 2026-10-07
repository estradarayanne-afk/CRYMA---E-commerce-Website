import { Link } from "react-router-dom";
import { LANDING_VISUALS } from "../../shared/constants/landingVisuals";
import "./AuthShell.css";

export function AuthVisualPanel({
    headline = <>Everything you need,<br /><span>all in one place.</span></>,
    description = "Discover products, manage your orders, and enjoy a simpler shopping experience with CRYMA.",
    footer = "Secure shopping experience",
    visual = LANDING_VISUALS.hero,
}) {
    return (
        <aside className="cryma-auth-visual">
            <img className="cryma-auth-visual-photo" src={visual.src} alt={visual.alt} fetchPriority="high" />
            <div className="cryma-auth-visual-shade" aria-hidden="true" />
            <div className="cryma-auth-visual-rings" aria-hidden="true" />
            <Link to="/" className="cryma-auth-logo"><span className="cryma-auth-logo-mark">C</span><span>CRYMA</span></Link>
            <div className="cryma-auth-visual-copy">
                <span className="cryma-auth-eyebrow">YOUR EVERYDAY MARKETPLACE</span>
                <h2>{headline}</h2>
                <p>{description}</p>
            </div>
            <div className="cryma-auth-trust-badge"><span aria-hidden="true">✓</span>Trusted marketplace · Local sellers</div>
            <div className="cryma-auth-visual-footer"><span>© 2026 CRYMA</span><span className="cryma-auth-dot" />{footer}</div>
        </aside>
    );
}

export default function AuthShell({ children, visualProps = {}, modal = false }) {
    return (
        <main className={`cryma-auth-page${modal ? " cryma-auth-page-modal" : ""}`}>
            <div className={`cryma-auth-shell${modal ? " cryma-auth-shell-modal" : ""}`}>
                <AuthVisualPanel {...visualProps} />
                <section className="cryma-auth-panel">{children}</section>
            </div>
        </main>
    );
}
