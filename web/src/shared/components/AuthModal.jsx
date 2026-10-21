import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Login from "../../auth/pages/BuyerLogin";
import Register from "../../auth/pages/Register";
import RegistrationChoice from "../../auth/pages/RegistrationChoice";
import AuthShell from "../../auth/components/AuthShell";
import Dialog from "./Dialog";
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
        };

        const handleClose = () => {
            setOpen(false);
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

        };
    }, []);

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
    };

    return (
        <Dialog
            open={open}
            onClose={close}
            ariaLabel={mode === "register" ? "Create a CRYMA account" : "Sign in to CRYMA"}
            overlayClassName="cryma-auth-overlay"
            className="cryma-auth-dialog"
        >
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
        </Dialog>
    );
}

export default AuthModal;
