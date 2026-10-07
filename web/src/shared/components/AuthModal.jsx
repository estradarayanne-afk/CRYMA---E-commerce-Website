import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Login from "../../auth/pages/BuyerLogin";
import Register from "../../auth/pages/Register";
import RegistrationChoice from "../../auth/pages/RegistrationChoice";
import AuthShell from "../../auth/components/AuthShell";
import { CLOSE_EVENT, OPEN_EVENT } from "./authModalEvents";
import "./AuthModal.css";

function AuthModal() {
    const [open, setOpen] = useState(false);
    const [mode, setMode] = useState("login");
    const [registrationRole, setRegistrationRole] = useState("");
    const [authOptions, setAuthOptions] = useState({});

    useEffect(() => {
        const handleOpen = (event) => {
            setMode(
                event.detail?.mode === "register"
                    ? "register"
                    : "login"
            );
            setRegistrationRole("");

            setAuthOptions(event.detail || {});
            setOpen(true);

            document.body.classList.add(
                "cryma-modal-open"
            );
        };

        const handleClose = () => {
            setOpen(false);

            document.body.classList.remove(
                "cryma-modal-open"
            );
        };

        window.addEventListener(
            OPEN_EVENT,
            handleOpen
        );

        window.addEventListener(
            CLOSE_EVENT,
            handleClose
        );

        return () => {
            window.removeEventListener(
                OPEN_EVENT,
                handleOpen
            );

            window.removeEventListener(
                CLOSE_EVENT,
                handleClose
            );

            document.body.classList.remove(
                "cryma-modal-open"
            );
        };
    }, []);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setOpen(false);

                document.body.classList.remove(
                    "cryma-modal-open"
                );
            }
        };

        document.addEventListener(
            "keydown",
            handleKeyDown
        );

        return () => {
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [open]);

    if (!open) {
        return null;
    }

    const switchMode = (nextMode) => {
        setMode(nextMode);
        if (nextMode === "register") setRegistrationRole("");

        setAuthOptions((current) => ({
            ...current,
            mode: nextMode,
        }));
    };

    const close = () => {
        setOpen(false);

        document.body.classList.remove(
            "cryma-modal-open"
        );
    };

    return (
        <div
            className="cryma-auth-overlay"
            role="presentation"
            onMouseDown={(event) => {
                if (
                    event.target ===
                    event.currentTarget
                ) {
                    close();
                }
            }}
        >
            <div onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={mode === "register" ? "Create a CRYMA account" : "Sign in to CRYMA"}>
              <AuthShell modal>
                <button
                    type="button"
                    className="cryma-auth-close"
                    aria-label="Close authentication dialog"
                    onClick={close}
                >
                    <X size={19} />
                </button>

                <div className="cryma-auth-modal-content">
                    <button type="button" className="cryma-auth-store-back" onClick={close}>
                        ← Back to store
                    </button>
                    {authOptions.promptTitle && (
                        <section className="cryma-auth-prompt">
                            <h2>{authOptions.promptTitle}</h2>
                            <p>{authOptions.promptMessage}</p>
                            <div>
                                <button
                                    type="button"
                                    className={mode === "login" ? "active" : ""}
                                    onClick={() => switchMode("login")}
                                >
                                    Sign In
                                </button>
                                <button
                                    type="button"
                                    className={mode === "register" ? "active" : ""}
                                    onClick={() => switchMode("register")}
                                >
                                    Create Account
                                </button>
                            </div>
                        </section>
                    )}
                    {mode === "register" ? (
                        registrationRole ? (
                            <Register
                                embedded
                                selectedRole={registrationRole}
                                onSwitchToLogin={() => switchMode("login")}
                            />
                        ) : (
                            <RegistrationChoice embedded onChooseRole={setRegistrationRole} />
                        )
                    ) : (
                        <Login
                            embedded
                            authOptions={authOptions}
                            onSwitchToRegister={() =>
                                switchMode("register")
                            }
                        />
                    )}
                </div>
              </AuthShell>
            </div>
        </div>
    );
}

export default AuthModal;
