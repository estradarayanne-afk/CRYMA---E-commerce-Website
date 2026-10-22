import { useCallback, useEffect, useRef, useState } from "react";
import {
    Navigate,
    Link,
    useLocation,
    useParams,
} from "react-router-dom";
import api from "../../shared/services/api";
import { PRODUCT_CATEGORIES } from "../../shared/constants/categories";
import { POLICY_VERSIONS } from "../../shared/constants/policyVersions";
import { LANDING_VISUALS } from "../../shared/constants/landingVisuals";
import PhilippineAddressFields from "../components/PhilippineAddressFields";
import AuthShell from "../components/AuthShell";
import { calculateAgeOnDate, capitalizeNameWords, getPhilippineCalendarDate, getRegistrationStepErrors, normalizePhilippineMobile, REGISTRATION_LIMITS } from "../validation/registrationRules";
import "./Register.css";
import "../styles/AuthPages.css";

function DocumentUploadField({ id, label, file, onSelect, onRemove, errorMessage }) {
    return (
        <div className="auth-field document-upload-field">
            <label htmlFor={id}>
                {label} <b>*</b>
            </label>
            <div className={`document-upload-card ${file ? "has-file" : ""}`}>
                <div className="document-upload-copy">
                    <strong>{file?.name || "No document selected"}</strong>
                    <small>{file ? "Ready to submit" : "Choose a file to attach to your application"}</small>
                </div>
                <label className="document-upload-action" htmlFor={id}>
                    {file ? "Replace" : "Choose file"}
                </label>
                {file && (
                    <button type="button" className="document-remove" onClick={onRemove}>
                        Remove
                    </button>
                )}
            </div>
            <input
                key={file ? `${file.name}-${file.size}-${file.lastModified}` : "empty"}
                className="document-upload-input"
                id={id}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={onSelect}
                aria-label={label}
            />
            <small className="file-help">Accepted by CRYMA: JPG, JPEG, PNG, or PDF. Maximum 5MB.</small>
            {errorMessage && <small className="registration-field-error">{errorMessage}</small>}
        </div>
    );
}

function EmailOtpInput({ value, onChange }) {
    const inputs = useRef([]);

    const handleChange = (index, event) => {
        const rawValue = event.target.value;
        const digits = rawValue.replace(/[^0-9]/g, "").slice(0, 6 - index);

        if (!rawValue) {
            onChange((current) => current.map((digit, currentIndex) =>
                currentIndex === index ? "" : digit
            ));
            return;
        }

        if (!digits) {
            return;
        }

        onChange((current) => {
            const next = [...current];
            [...digits].forEach((digit, offset) => {
                next[index + offset] = digit;
            });
            return next;
        });
        inputs.current[Math.min(index + digits.length, 5)]?.focus();
    };

    const handleKeyDown = (index, event) => {
        if (event.key === "Backspace" && !value[index] && index > 0) {
            event.preventDefault();
            onChange((current) => current.map((digit, currentIndex) =>
                currentIndex === index - 1 ? "" : digit
            ));
            inputs.current[index - 1]?.focus();
        } else if (event.key === "ArrowLeft" && index > 0) {
            event.preventDefault();
            inputs.current[index - 1]?.focus();
        } else if (event.key === "ArrowRight" && index < 5) {
            event.preventDefault();
            inputs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (event) => {
        event.preventDefault();
        const digits = event.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);

        if (digits) {
            onChange([...digits, ...Array(6 - digits.length).fill("")]);
            inputs.current[Math.min(digits.length - 1, 5)]?.focus();
        }
    };

    return (
        <div className="email-otp-inputs" role="group" aria-labelledby="email-otp-label">
            {Array.from({ length: 6 }, (_, index) => (
                <input
                    key={index}
                    ref={(element) => {
                        inputs.current[index] = element;
                    }}
                    id={index === 0 ? "email-otp" : undefined}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    pattern="[0-9]*"
                    maxLength={index === 0 ? 6 : 1}
                    value={value[index]}
                    onChange={(event) => handleChange(index, event)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    onPaste={handlePaste}
                    aria-label={`Digit ${index + 1} of 6`}
                    required
                />
            ))}
        </div>
    );
}

function Register({
    embedded = false,
    selectedRole,
    onSwitchToLogin,
}) {
    const location = useLocation();
    const { role: routeRole } = useParams();
    const role = routeRole || selectedRole;

    const registrationRole = ["seller", "rider", "logistics"].includes(role)
        ? role
        : "buyer";
    const accountType = registrationRole === "rider"
        ? "Courier"
        : registrationRole === "logistics"
            ? "Logistics"
        : registrationRole.charAt(0).toUpperCase() + registrationRole.slice(1);
    const registrationVisual = LANDING_VISUALS.hero;

    // SELLER
    const [businessName, setBusinessName] = useState("");
    const [tin, setTin] = useState("");
    const [lineOfBusiness, setLineOfBusiness] = useState("");
    const [businessPermit, setBusinessPermit] = useState(null);
    const [vehicleType, setVehicleType] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [orCr, setOrCr] = useState(null);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [emailDeliveryFailed, setEmailDeliveryFailed] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
    const [acceptanceError, setAcceptanceError] = useState("");
    const [otp, setOtp] = useState(() => Array(6).fill(""));
    const [emailVerified, setEmailVerified] = useState(false);
    const stepTransitionLocked = useRef(false);
    const registrationSubmissionLocked = useRef(false);

    // =========================
    // PERSONAL INFORMATION
    // =========================
    const [firstName, setFirstName] = useState("");
    const [middleName, setMiddleName] = useState("");
    const [lastName, setLastName] = useState("");
    const [birthDate, setBirthDate] = useState("");
    const [sex, setSex] = useState("");
    const [age, setAge] = useState("");

    // =========================
    // CONTACT
    // =========================
    const [phone, setPhone] = useState("");

    // =========================
    // ADDRESS
    // =========================
    const [region, setRegion] = useState("");
    const [province, setProvince] = useState("");
    const [municipality, setMunicipality] = useState("");
    const [barangay, setBarangay] = useState("");

    const [houseNumber, setHouseNumber] = useState("");
    const [street, setStreet] = useState("");
    const [buildingName, setBuildingName] = useState("");
    const [unitNumber, setUnitNumber] = useState("");
    const [postalCode, setPostalCode] = useState("");

    // =========================
    // ACCOUNT
    // =========================
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] =
        useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] =
        useState(false);

    // =========================
    // REQUIREMENTS
    // =========================
    const [validId, setValidId] = useState(null);
    const [driversLicense, setDriversLicense] = useState(null);

    const roleInfoStep = registrationRole === "buyer" ? null : 4;
    const verificationStep = roleInfoStep ? 5 : 4;
    const reviewStep = verificationStep + 1;
    const steps = [
        {
            number: 1,
            label: "Personal",
        },
        {
            number: 2,
            label: "Address",
        },
        {
            number: 3,
            label: "Account",
        },
        ...(["seller", "logistics"].includes(registrationRole) ? [{ number: 4, label: "Business" }] : []),
        ...(registrationRole === "rider" ? [{ number: 4, label: "Vehicle" }] : []),
        { number: verificationStep, label: "Verification" },
        { number: reviewStep, label: "Review" },
    ];

    // =========================
    // AGE
    // =========================
    const calculateAge = (birthdate) => {
        if (!birthdate) return "";
        return calculateAgeOnDate(birthdate) ?? "";
    };

    const handleBirthDateChange = (value) => {
        setBirthDate(value);
        setAge(calculateAge(value));
    };

    // =========================
    // PASSWORD STRENGTH
    // =========================
    const getPasswordStrength = () => {
        if (!password) return "";

        if (password.length < 8) {
            return "Weak";
        }

        if (
            password.length >= 8 &&
            password.length < 12
        ) {
            return "Medium";
        }

        return "Strong";
    };

    // =========================
    // ADDRESS CHANGE
    // =========================
    const handleAddressChange = useCallback(({
        region: newRegion,
        province: newProvince,
        city: newCity,
        barangay: newBarangay,
    }) => {
        setRegion(newRegion);
        setProvince(newProvince);
        setMunicipality(newCity);
        setBarangay(newBarangay);
    }, []);

    // =========================
    // VALIDATE EACH STEP
    // =========================
    const validationValues = {
        firstName, middleName, lastName, birthDate, sex, phone, region,
        province, municipality, barangay, houseNumber, street, buildingName,
        unitNumber, postalCode, email, password, passwordConfirmation,
        businessName, tin, lineOfBusiness, vehicleType, plateNumber, validId,
        businessPermit, orCr, driversLicense, registrationRole, verificationStep,
    };
    const currentStepErrors = getRegistrationStepErrors(step, validationValues);

    useEffect(() => {
        stepTransitionLocked.current = false;
    }, [step]);

    const validateStep = (stepToValidate = step) => {
        const errors = getRegistrationStepErrors(stepToValidate, validationValues);
        setError("");
        return Object.keys(errors).length === 0;
    };

    // =========================
    // NEXT
    // =========================
    const handleNext = () => {
        if (stepTransitionLocked.current || loading) return;
        if (!validateStep()) {
            return;
        }

        stepTransitionLocked.current = true;
        setStep(Math.min(step + 1, reviewStep));

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    // =========================
    // BACK
    // =========================
    const handleBack = () => {
        setError("");

        setStep((current) =>
            Math.max(current - 1, 1)
        );

        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    // =========================
    // VALID ID
    // =========================
    const handleDocumentChange = (event, setDocument, label) => {
        const file = event.target.files?.[0];

        if (!file) {
            setDocument(null);
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError(
                `${label} must be a JPG, JPEG, PNG, or PDF file.`
            );

            event.target.value = "";
            setDocument(null);

            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError(
                `${label} must not exceed 5MB.`
            );

            event.target.value = "";
            setDocument(null);

            return;
        }

        setError("");
        setDocument(file);
    };

    const handleValidIdChange = (event) => handleDocumentChange(event, setValidId, "Valid ID");

    // =========================
    // REGISTER
    // =========================
    const handleRegister = async (event) => {
        event.preventDefault();

        if (step !== reviewStep || loading || registrationSubmissionLocked.current) return;

        setError("");

        const stepsToValidate = [1, 2, 3, ...(registrationRole !== "buyer" ? [4] : []), verificationStep];
        const firstInvalidStep = stepsToValidate.find((stepToValidate) => !validateStep(stepToValidate));
        if (firstInvalidStep !== undefined) {
            setStep(firstInvalidStep);
            return;
        }
        if (!termsAccepted || !privacyAcknowledged) {
            setAcceptanceError("Accept the Terms and Conditions and acknowledge the Privacy Notice to submit your registration.");
            return;
        }
        setAcceptanceError("");

        registrationSubmissionLocked.current = true;
        setLoading(true);

        try {
            /*
             * Laravel RegistrationController expects
             * multipart/form-data because valid_id is a file.
             */
            const formData = new FormData();

            // PERSONAL
            formData.append(
                "first_name",
                firstName.trim()
            );

            if (middleName.trim()) {
                formData.append(
                    "middle_name",
                    middleName.trim()
                );
            }

            formData.append(
                "last_name",
                lastName.trim()
            );

            formData.append(
                "sex",
                sex
            );

            formData.append(
                "birthday",
                birthDate
            );

            // CONTACT
            formData.append(
                "phone",
                normalizePhilippineMobile(phone)
            );

            // ROLE
            formData.append("role", registrationRole);
            formData.append("terms_accepted", "1");
            formData.append("terms_version", POLICY_VERSIONS.terms);
            formData.append("privacy_notice_acknowledged", "1");
            formData.append("privacy_version", POLICY_VERSIONS.privacy);

            if (["seller", "logistics"].includes(registrationRole)) {
                formData.append(
                    "business_name",
                    businessName.trim()
                );

                if (registrationRole === "seller") {
                    if (tin.trim()) formData.append("tin", tin.trim());
                    formData.append("line_of_business", lineOfBusiness.trim());
                }

                formData.append(
                    "business_permit",
                    businessPermit
                );
            }

            if (registrationRole === "rider") {
                formData.append("vehicle_type", vehicleType);
                formData.append("plate_number", plateNumber.trim());
                formData.append("or_cr", orCr);
                formData.append("drivers_license", driversLicense);
            }

            // ADDRESS
            formData.append("region", region);
            formData.append(
                "province",
                province
            );

            formData.append(
                "municipality",
                municipality
            );

            formData.append(
                "barangay",
                barangay
            );

            if (street.trim()) {
                formData.append(
                    "street",
                    street.trim()
                );
            }

            if (houseNumber.trim()) {
                formData.append(
                    "house_number",
                    houseNumber.trim()
                );
            }

            if (buildingName.trim()) {
                formData.append(
                    "building_name",
                    buildingName.trim()
                );
            }

            if (unitNumber.trim()) {
                formData.append(
                    "unit_number",
                    unitNumber.trim()
                );
            }

            if (postalCode.trim()) {
                formData.append(
                    "postal_code",
                    postalCode.trim()
                );
            }

            // ACCOUNT
            formData.append(
                "email",
                email.trim().toLowerCase()
            );

            formData.append(
                "password",
                password
            );

            /*
             * Laravel's `confirmed` rule expects
             * password_confirmation.
             */
            formData.append(
                "password_confirmation",
                passwordConfirmation
            );

            // REQUIREMENT
            formData.append(
                "valid_id",
                validId
            );

            /*
             * Correct backend endpoint:
             *
             * /api/register
             *
             * NOT /api/auth/register
             */
            await api.post(
                "/register",
                formData,
                {
                    headers: {
                        "Content-Type":
                            "multipart/form-data",
                    },
                }
            );

            setSubmitted(true);
            setEmailDeliveryFailed(false);
            setEmailVerified(false);
            setOtp(Array(6).fill(""));
        } catch (err) {
            console.error(
                "Registration error:",
                err
            );

            if (err.response?.data?.registration_saved) {
                setSubmitted(true);
                setEmailDeliveryFailed(true);
                setEmailVerified(false);
                setOtp(Array(6).fill(""));
                setError(err.response.data.message);
                return;
            }

            const validationErrors =
                err.response?.data?.errors;

            if (validationErrors) {
                const firstError =
                    Object.values(
                        validationErrors
                    )?.[0]?.[0];

                setError(
                    firstError ||
                    "Please check the information you entered."
                );
            } else {
                setError(
                    err.response?.data?.message ||
                    "Registration failed. Please check your information and try again."
                );
            }
        } finally {
            registrationSubmissionLocked.current = false;
            setLoading(false);
        }
    };

    const handleFormSubmit = (event) => {
        if (step < reviewStep) {
            event.preventDefault();
            handleNext();
            return;
        }
        handleRegister(event);
    };

const handleVerifyEmail = async (event) => {
    event.preventDefault();
    setError("");

    const otpCode = otp.join("");

    if (!/^\d{6}$/.test(otpCode)) {
        setError("Please enter the six-digit verification code.");
        return;
    }

    setLoading(true);

    try {
        await api.post("/verify-email", {
            email: email.trim().toLowerCase(),
            otp: otpCode,
        });

        setEmailVerified(true);
    } catch (err) {
        const validationErrors = err.response?.data?.errors;
        const firstError = validationErrors
            ? Object.values(validationErrors)?.[0]?.[0]
            : null;

        setError(
            firstError ||
            err.response?.data?.message ||
            "Email verification failed. Please try again."
        );
    } finally {
        setLoading(false);
    }
};

const handleResendVerification = async () => {
    setError("");
    setLoading(true);
    try {
        const response = await api.post("/resend-verification", { email: email.trim().toLowerCase() });
        setEmailDeliveryFailed(false);
        setError(response.data?.message || "If this address has a pending registration, a new verification code has been sent.");
    } catch (err) {
        setEmailDeliveryFailed(true);
        setError(err.response?.data?.message || "Unable to request a new code right now. Please try again shortly.");
    } finally {
        setLoading(false);
    }
};


    const fullName = [
        firstName,
        middleName,
        lastName,
    ]
        .filter(Boolean)
        .join(" ");
    const maxBirthday = getPhilippineCalendarDate();

    if (routeRole && !location.state?.accountTypeSelected) {
        return <Navigate to="/register" replace />;
    }

    const content = (
        <div className={`register-page ${embedded ? "embedded" : ""}`}>

                {/* =========================
                    FORM PANEL
                ========================== */}
                <main className="register-content">
                    {emailVerified ? (
                        <section className="register-submission-success" role="status">
                            <span className="register-success-eyebrow">EMAIL VERIFIED</span>
                            <h2>
                                {registrationRole === "rider"
                                    ? "Pending Logistics/Sorting Center Approval"
                                    : "Pending Administrator Approval"}
                            </h2>
                            <p>
                                Your email has been verified. Please wait for{" "}
                                {registrationRole === "rider"
                                    ? "the Logistics/Sorting Center's"
                                    : "the administrator's"}{" "}
                                approval before accessing your account.
                            </p>
                            <Link to="/" className="primary-action">Return to CRYMA</Link>
                        </section>

                    ) : submitted ? (
                        <section className="register-submission-success otp-verification-card" aria-labelledby="otp-verification-title">
                            <div className="otp-verification-icon" aria-hidden="true">
                                <svg viewBox="0 0 24 24" fill="none">
                                    <path d="M4.75 7.25A2.25 2.25 0 0 1 7 5h10a2.25 2.25 0 0 1 2.25 2.25v9.5A2.25 2.25 0 0 1 17 19H7a2.25 2.25 0 0 1-2.25-2.25v-9.5Z" />
                                    <path d="m5.5 7 6.5 5 6.5-5" />
                                    <path d="m15.5 16 1.5 1.5 3-3" />
                                </svg>
                            </div>
                            <span className="register-success-eyebrow">EMAIL VERIFICATION</span>
                            <h2 id="otp-verification-title">Confirm your email address</h2>
                            <p className="otp-verification-copy">
                                {emailDeliveryFailed
                                    ? "Your account is saved, but we could not deliver the verification email. Try resending the code below."
                                    : "Enter the six-digit code we sent to this address to verify your CRYMA account."}
                            </p>
                            <div className="otp-email-callout">
                                <span className="otp-email-label">
                                    {emailDeliveryFailed ? "Verification email delivery needs attention" : "Verification email sent to"}
                                </span>
                                <strong>{email}</strong>
                            </div>

                            {error && (
                                <div className="register-error" role="alert">
                                    <span>!</span>
                                    <p>{error}</p>
                                </div>
                            )}

                            <form onSubmit={handleVerifyEmail} className="register-form">
                                <div className="auth-field">
                                    <label id="email-otp-label" htmlFor="email-otp" className="otp-code-label">
                                        <span>Enter verification code</span>
                                        <span className="otp-code-count">6 digits</span>
                                    </label>
                                    <EmailOtpInput value={otp} onChange={setOtp} />
                                    <small className="email-otp-hint">
                                        Use the code from your inbox. It expires after 10 minutes.
                                    </small>
                                </div>

                                <button
                                    type="submit"
                                    className="primary-action otp-verify-action"
                                    disabled={loading}
                                    aria-busy={loading}
                                >
                                    {loading ? "Verifying..." : "Verify email"}
                                </button>
                            </form>
                            <div className="otp-resend-area">
                                <span>Didn’t receive the email?</span>
                                <button type="button" className="secondary-action otp-resend-action" onClick={handleResendVerification} disabled={loading} aria-busy={loading}>
                                {loading ? "Please wait..." : "Resend verification code"}
                                </button>
                            </div>
                        </section>
                    ) : (
                        <>
                        <div className="register-top">

                        <div>
                            <span className="register-mobile-eyebrow">
                                CRYMA ACCOUNT
                            </span>

                            <h2>
                                Create account
                            </h2>

                            <p>
                                Your application will be reviewed before account access is activated.
                            </p>
                        </div>

                        <Link
                            to="/"
                            className="register-back"
                        >
                            Back to store
                        </Link>
                    </div>

                    {/* =========================
                        STEPPER
                    ========================== */}
                    <div className="register-stepper">
                        {steps.map(
                            (item, index) => {
                                const active =
                                    step ===
                                    item.number;

                                const completed =
                                    step >
                                    item.number;

                                return (
                                    <div
                                        className={`register-step ${
                                            active
                                                ? "active"
                                                : ""
                                        } ${
                                            completed
                                                ? "completed"
                                                : ""
                                        }`}
                                        key={
                                            item.number
                                        }
                                    >
                                        <div className="register-step-number">
                                            {completed
                                                ? "\u2713"
                                                : item.number}
                                        </div>

                                        <span>
                                            {item.label}
                                        </span>

                                        {index <
                                            steps.length -
                                                1 && (
                                            <div className="register-step-line" />
                                        )}
                                    </div>
                                );
                            }
                        )}
                    </div>

                    {/* =========================
                        ERROR
                    ========================== */}
                    {error && (
                        <div className="register-error">
                            <span>!</span>

                            <p>
                                {error}
                            </p>
                        </div>
                    )}

                    <form
                        className="register-form"
                        onSubmit={handleFormSubmit}
                    >

                        {/* =========================
                            STEP 1
                        ========================== */}
                        {step === 1 && (
                            <section className="register-section">
                                <div className="section-heading">
                                    <span>
                                        STEP 01
                                    </span>

                                    <h3>
                                        Personal information
                                    </h3>

                                    <p>
                                        Tell us a little
                                        about yourself.
                                    </p>
                                </div>

                                <div className="form-grid two">
                                    <div className="auth-field">
                                        <label>
                                            First Name
                                            <b>*</b>
                                        </label>

                                        <input
                                            type="text"
                                            maxLength={REGISTRATION_LIMITS.firstName}
                                            required
                                            aria-invalid={Boolean(currentStepErrors.firstName)}
                                            value={
                                                firstName
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setFirstName(capitalizeNameWords(e.target.value))
                                            }
                                            placeholder="Enter first name"
                                        />
                                        {currentStepErrors.firstName && <small className="registration-field-error">{currentStepErrors.firstName}</small>}
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Middle Initial
                                        </label>

                                        <input
                                            type="text"
                                            maxLength={REGISTRATION_LIMITS.middleName}
                                            aria-invalid={Boolean(currentStepErrors.middleName)}
                                            value={
                                                middleName
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setMiddleName(capitalizeNameWords(e.target.value))
                                            }
                                                placeholder="e.g. A"
                                        />
                                        {currentStepErrors.middleName && <small className="registration-field-error">{currentStepErrors.middleName}</small>}
                                    </div>
                                </div>

                                <div className="form-grid two">
                                    <div className="auth-field">
                                        <label>
                                            Last Name
                                            <b>*</b>
                                        </label>

                                        <input
                                            type="text"
                                            maxLength={REGISTRATION_LIMITS.lastName}
                                            required
                                            aria-invalid={Boolean(currentStepErrors.lastName)}
                                            value={
                                                lastName
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setLastName(capitalizeNameWords(e.target.value))
                                            }
                                            placeholder="Enter last name"
                                        />
                                        {currentStepErrors.lastName && <small className="registration-field-error">{currentStepErrors.lastName}</small>}
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Birthday
                                            <b>*</b>
                                        </label>

                                        <input
                                            type="date"
                                                max={maxBirthday}
                                            required
                                            aria-invalid={Boolean(currentStepErrors.birthDate)}
                                            value={
                                                birthDate
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                handleBirthDateChange(
                                                    e.target
                                                        .value
                                                )
                                            }
                                        />
                                        {currentStepErrors.birthDate && <small className="registration-field-error">{currentStepErrors.birthDate}</small>}
                                    </div>
                                </div>

                                <div className="form-grid two">
                                    <div className="auth-field">
                                        <label>
                                            Age <b>*</b>
                                        </label>

                                        <div className="readonly-field">
                                            {age
                                                ? `${age} years old`
                                                : "Automatically calculated"}
                                        </div>
                                        <small className="field-hint">Auto-generated from your birthday</small>
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Sex
                                            <b>*</b>
                                        </label>

                                        <div className="sex-options">
                                            <button
                                                type="button"
                                                className={
                                                    sex ===
                                                    "male"
                                                        ? "selected"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setSex(
                                                        "male"
                                                    )
                                                }
                                            >
                                                Male
                                            </button>

                                            <button
                                                type="button"
                                                className={
                                                    sex ===
                                                    "female"
                                                        ? "selected"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setSex(
                                                        "female"
                                                    )
                                                }
                                            >
                                                Female
                                            </button>

                                            <button
                                                type="button"
                                                className={
                                                    sex ===
                                                    "prefer_not_to_say"
                                                        ? "selected"
                                                        : ""
                                                }
                                                onClick={() =>
                                                    setSex(
                                                        "prefer_not_to_say"
                                                    )
                                                }
                                            >
                                                Prefer not to say
                                            </button>
                                        </div>
                                        {currentStepErrors.sex && <small className="registration-field-error">{currentStepErrors.sex}</small>}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* =========================
                            STEP 2
                        ========================== */}
                        {step === 2 && (
                            <section className="register-section">
                                <div className="section-heading">
                                    <span>
                                        STEP 02
                                    </span>

                                    <h3>
                                        Contact & address
                                    </h3>

                                    <p>
                                        Select your Philippine
                                        location, then enter
                                        your specific address
                                        details.
                                    </p>
                                </div>

                                <div className="auth-field">
                                    <label>
                                        Contact No.
                                        <b>*</b>
                                    </label>

                                    <div className="registration-phone-input">
                                        <span className="registration-phone-prefix" aria-hidden="true">+63</span>
                                        <input
                                            type="tel"
                                            inputMode="numeric"
                                            maxLength={REGISTRATION_LIMITS.phone}
                                            autoComplete="tel-national"
                                            pattern="9[0-9]{9}"
                                            required
                                            aria-label="Mobile number after +63"
                                            aria-invalid={Boolean(currentStepErrors.phone)}
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, REGISTRATION_LIMITS.phone))}
                                            placeholder="9171234567"
                                        />
                                    </div>
                                    {currentStepErrors.phone && <small className="registration-field-error">{currentStepErrors.phone}</small>}
                                </div>

                                <div className="address-api-label">
                                    <span>
                                        Philippine address
                                    </span>

                                    <small>
                                        Select your region to load the correct province, then city /
                                        municipality and
                                        barangay.
                                    </small>
                                </div>

                                <PhilippineAddressFields
                                    region={region}
                                    province={province}
                                    city={
                                        municipality
                                    }
                                    barangay={
                                        barangay
                                    }
                                    errors={currentStepErrors}
                                    onChange={
                                        handleAddressChange
                                    }
                                    onPostalCodeChange={setPostalCode}
                                />

                                <div className="form-grid two">
                                    <div className="auth-field">
                                        <label>
                                            House Number <b>*</b>
                                        </label>

                                        <input
                                            type="text"
                                            maxLength={REGISTRATION_LIMITS.houseNumber}
                                            required
                                            aria-invalid={Boolean(currentStepErrors.houseNumber)}
                                            value={
                                                houseNumber
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setHouseNumber(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            placeholder="e.g. 123"
                                        />
                                        {currentStepErrors.houseNumber && <small className="registration-field-error">{currentStepErrors.houseNumber}</small>}
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Street <b>*</b>
                                        </label>

                                        <input
                                            type="text"
                                            maxLength={REGISTRATION_LIMITS.street}
                                            required
                                            aria-invalid={Boolean(currentStepErrors.street)}
                                            value={
                                                street
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setStreet(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            placeholder="e.g. Rizal Street"
                                        />
                                        {currentStepErrors.street && <small className="registration-field-error">{currentStepErrors.street}</small>}
                                    </div>
                                </div>

                                <div className="form-grid two">
                                    <div className="auth-field">
                                        <label>
                                            Building /
                                            Subdivision
                                        </label>

                                        <input
                                            type="text"
                                            maxLength={REGISTRATION_LIMITS.buildingName}
                                            aria-invalid={Boolean(currentStepErrors.buildingName)}
                                            value={
                                                buildingName
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setBuildingName(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            placeholder="Optional"
                                        />
                                        {currentStepErrors.buildingName && <small className="registration-field-error">{currentStepErrors.buildingName}</small>}
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Unit / Floor
                                        </label>

                                        <input
                                            type="text"
                                            maxLength={REGISTRATION_LIMITS.unitNumber}
                                            aria-invalid={Boolean(currentStepErrors.unitNumber)}
                                            value={
                                                unitNumber
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setUnitNumber(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            placeholder="Optional"
                                        />
                                        {currentStepErrors.unitNumber && <small className="registration-field-error">{currentStepErrors.unitNumber}</small>}
                                    </div>
                                </div>

                                <div className="auth-field">
                                    <label htmlFor="registration-postal-code">Postal Code <b>*</b></label>
                                    <input id="registration-postal-code" type="text" inputMode="numeric" maxLength={REGISTRATION_LIMITS.postalCode} value={postalCode} onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, "").slice(0, REGISTRATION_LIMITS.postalCode))} placeholder={municipality ? "Enter postal code" : "Select municipality"} aria-invalid={Boolean(currentStepErrors.postalCode)} />
                                    {currentStepErrors.postalCode && <small className="registration-field-error">{currentStepErrors.postalCode}</small>}
                                    <small className="field-hint">{postalCode ? "Suggested from the locality reference; verify it is correct for your address" : municipality ? "No verified locality code is available; enter the correct four-digit postal code" : "Suggested automatically when locality data is available"}</small>
                                </div>
                            </section>
                        )}

                        {/* =========================
                            STEP 3
                        ========================== */}
                        {step === 3 && (
                            <section className="register-section">
                                <div className="section-heading">
                                    <span>
                                        STEP 03
                                    </span>

                                    <h3>
                                        Account security
                                    </h3>

                                    <p>
                                        Create the login
                                        credentials you
                                        will use for CRYMA.
                                    </p>
                                </div>

                                <div className="auth-field">
                                    <label>
                                            E-mail
                                        <b>*</b>
                                    </label>

                                    <input
                                        type="email"
                                        minLength={3}
                                        maxLength={REGISTRATION_LIMITS.email}
                                        autoComplete="email"
                                        required
                                        aria-invalid={Boolean(currentStepErrors.email)}
                                        value={email}
                                        onChange={(
                                            e
                                        ) =>
                                            setEmail(
                                                e.target
                                                    .value
                                            )
                                        }
                                        placeholder="you@example.com"
                                    />
                                    {currentStepErrors.email && <small className="registration-field-error">{currentStepErrors.email}</small>}
                                </div>

                                <div className="auth-field">
                                    <label>
                                        Password
                                        <b>*</b>
                                    </label>

                                    <div className="password-field">
                                        <input
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            minLength={8}
                                            maxLength={REGISTRATION_LIMITS.password}
                                            autoComplete="new-password"
                                            required
                                            aria-invalid={Boolean(currentStepErrors.password)}
                                            value={
                                                password
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setPassword(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            placeholder="Create a password"
                                        />
                                        {currentStepErrors.password && <small className="registration-field-error">{currentStepErrors.password}</small>}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPassword(
                                                    (
                                                        current
                                                    ) =>
                                                        !current
                                                )
                                            }
                                        >
                                            {showPassword
                                                ? "Hide"
                                                : "Show"}
                                        </button>
                                    </div>

                                    {password && (
                                        <div
                                            className={`password-strength ${getPasswordStrength().toLowerCase()}`}
                                        >
                                            <span>
                                                Password strength:
                                            </span>

                                            <strong>
                                                {getPasswordStrength()}
                                            </strong>
                                        </div>
                                    )}
                                </div>

                                <div className="auth-field">
                                    <label>
                                        Confirm password
                                        <b>*</b>
                                    </label>

                                    <div className="password-field">
                                        <input
                                            type={
                                                showPasswordConfirmation
                                                    ? "text"
                                                    : "password"
                                            }
                                            minLength={8}
                                            maxLength={REGISTRATION_LIMITS.password}
                                            autoComplete="new-password"
                                            required
                                            aria-invalid={Boolean(currentStepErrors.passwordConfirmation)}
                                            value={
                                                passwordConfirmation
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setPasswordConfirmation(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Repeat your password"
                                        />
                                        {currentStepErrors.passwordConfirmation && <small className="registration-field-error">{currentStepErrors.passwordConfirmation}</small>}

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowPasswordConfirmation(
                                                    (
                                                        current
                                                    ) =>
                                                        !current
                                                )
                                            }
                                        >
                                            {showPasswordConfirmation
                                                ? "Hide"
                                                : "Show"}
                                        </button>
                                    </div>
                                </div>
                            </section>
                        )}

                        {roleInfoStep === 4 && step === 4 && ["seller", "logistics"].includes(registrationRole) && (
                            <section className="register-section">
                                <div className="section-heading"><span>STEP 04</span><h3>Business information</h3><p>{registrationRole === "logistics" ? "Tell us about the business operating this logistics or sorting center." : "Tell us about the store you are applying to operate."}</p></div>
                                <div className="review-card seller-registration-card">
                                    <div className="auth-field"><label htmlFor="business-name">Business Name <b>*</b></label><input id="business-name" type="text" maxLength={REGISTRATION_LIMITS.businessName} required aria-invalid={Boolean(currentStepErrors.businessName)} value={businessName} onChange={(event) => setBusinessName(capitalizeNameWords(event.target.value))} placeholder="Enter your business name" />{currentStepErrors.businessName && <small className="registration-field-error">{currentStepErrors.businessName}</small>}</div>
                                    {registrationRole === "seller" && <>
                                        <div className="auth-field"><label htmlFor="seller-tin">Tax Identification Number (TIN) <span className="auto-generated-label">Optional</span></label><input id="seller-tin" type="text" inputMode="numeric" autoComplete="off" maxLength={REGISTRATION_LIMITS.tin} value={tin} onChange={(event) => setTin(event.target.value.replace(/\D/g, "").slice(0, REGISTRATION_LIMITS.tin))} placeholder="Enter 9 to 13 digit TIN" aria-invalid={Boolean(currentStepErrors.tin)} aria-describedby="seller-tin-help" /><small id="seller-tin-help" className="field-hint">For your seller tax and business records. Enter digits only; you may add it later.</small>{currentStepErrors.tin && <small className="registration-field-error">{currentStepErrors.tin}</small>}</div>
                                        <div className="auth-field"><label htmlFor="line-of-business">Line of Business / Category <b>*</b></label><select id="line-of-business" required aria-invalid={Boolean(currentStepErrors.lineOfBusiness)} value={lineOfBusiness} onChange={(event) => setLineOfBusiness(event.target.value)}><option value="">Select a category</option>{PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select>{currentStepErrors.lineOfBusiness && <small className="registration-field-error">{currentStepErrors.lineOfBusiness}</small>}</div>
                                    </>}
                                </div>
                            </section>
                        )}

                        {roleInfoStep === 4 && step === 4 && registrationRole === "rider" && (
                            <section className="register-section">
                                <div className="section-heading"><span>STEP 04</span><h3>Vehicle information</h3><p>Tell us which vehicle you will use for CRYMA deliveries.</p></div>
                                <div className="review-card seller-registration-card form-grid two">
                                    <div className="auth-field"><label htmlFor="vehicle-type">Choose Vehicle <b>*</b></label><select id="vehicle-type" required aria-invalid={Boolean(currentStepErrors.vehicleType)} value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}><option value="">Select vehicle</option><option value="motorcycle">Motorcycle</option><option value="tricycle">Tricycle</option><option value="car">Car</option><option value="van">Van</option><option value="truck">Truck</option></select>{currentStepErrors.vehicleType && <small className="registration-field-error">{currentStepErrors.vehicleType}</small>}</div>
                                    <div className="auth-field"><label htmlFor="plate-number">Plate Number <b>*</b></label><input id="plate-number" type="text" maxLength={REGISTRATION_LIMITS.plateNumber} required aria-invalid={Boolean(currentStepErrors.plateNumber)} value={plateNumber} onChange={(event) => setPlateNumber(event.target.value)} placeholder="Enter vehicle plate number" />{currentStepErrors.plateNumber && <small className="registration-field-error">{currentStepErrors.plateNumber}</small>}</div>
                                </div>
                            </section>
                        )}

                        {step === verificationStep && (
                            <section className="register-section">
                                <div className="section-heading"><span>STEP {String(verificationStep).padStart(2, "0")}</span><h3>Verification documents</h3><p>Upload clear images or PDF files of the documents required for your {accountType.toLowerCase()} application.</p></div>
                                <div className="review-card seller-registration-card">
                                    <DocumentUploadField id="valid-id" label="Upload Valid ID" file={validId} onSelect={handleValidIdChange} onRemove={() => setValidId(null)} errorMessage={currentStepErrors.validId} />
                                    {["seller", "logistics"].includes(registrationRole) && <DocumentUploadField id="business-permit" label="Upload Business / DTI Permit" file={businessPermit} onSelect={(event) => handleDocumentChange(event, setBusinessPermit, "Business Permit")} onRemove={() => setBusinessPermit(null)} errorMessage={currentStepErrors.businessPermit} />}
                                    {registrationRole === "rider" && <DocumentUploadField id="drivers-license" label="Upload Driver's License" file={driversLicense} onSelect={(event) => handleDocumentChange(event, setDriversLicense, "Driver's License")} onRemove={() => setDriversLicense(null)} errorMessage={currentStepErrors.driversLicense} />}
                                    {registrationRole === "rider" && <DocumentUploadField id="or-cr" label="Upload OR/CR" file={orCr} onSelect={(event) => handleDocumentChange(event, setOrCr, "OR/CR")} onRemove={() => setOrCr(null)} errorMessage={currentStepErrors.orCr} />}
                                </div>
                            </section>
                        )}

                        {step === reviewStep && (
                            <section className="register-section">
                                <div className="section-heading"><span>STEP {String(reviewStep).padStart(2, "0")}</span><h3>Review your application</h3><p>Confirm your information and uploaded documents before submitting.</p></div>
                                <div className="registration-note" role="note"><span aria-hidden="true">i</span><p>After submitting your registration, please verify your email and wait for {registrationRole === "rider" ? "administrator approval of your courier application" : "administrator approval"} before accessing the workspace.</p></div>

                                {/* PERSONAL */}
                                <div className="review-card">
                                    <div className="review-card-header">
                                        <div>
                                            <span>
                                                PERSONAL
                                            </span>

                                            <h4>
                                                Personal information
                                            </h4>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setStep(
                                                    1
                                                )
                                            }
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    <div className="review-grid">
                                        <div>
                                            <small>
                                                Full name
                                            </small>

                                            <strong>
                                                {fullName ||
                                                    "\u2014"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Sex
                                            </small>

                                            <strong>
                                                {sex
                                                    ? sex
                                                        .replaceAll(
                                                            "_",
                                                            " "
                                                        )
                                                        .replace(
                                                            /^\w/,
                                                            (
                                                                letter
                                                            ) =>
                                                                letter.toUpperCase()
                                                        )
                                                    : "\u2014"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Birthday
                                            </small>

                                            <strong>
                                                {birthDate ||
                                                    "\u2014"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Age
                                            </small>

                                            <strong>
                                                {age
                                                    ? `${age} years old`
                                                    : "\u2014"}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* ADDRESS */}
                                <div className="review-card">
                                    <div className="review-card-header">
                                        <div>
                                            <span>
                                                ADDRESS
                                            </span>

                                            <h4>
                                                Contact & address
                                            </h4>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setStep(
                                                    2
                                                )
                                            }
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    <div className="review-grid">
                                        <div>
                                            <small>
                                                Mobile
                                            </small>

                                            <strong>
                                                {phone ? `+63 ${phone}` : "\u2014"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Province
                                            </small>

                                            <strong>
                                                {province ||
                                                    "\u2014"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Municipality
                                            </small>

                                            <strong>
                                                {municipality ||
                                                    "\u2014"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Barangay
                                            </small>

                                            <strong>
                                                {barangay ||
                                                    "\u2014"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>Postal Code</small>
                                            <strong>{postalCode || "Not available for this municipality"}</strong>
                                        </div>

                                        <div>
                                            <small>
                                                House number
                                            </small>

                                            <strong>
                                                {houseNumber ||
                                                    "\u2014"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Street
                                            </small>

                                            <strong>
                                                {street ||
                                                    "\u2014"}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                {/* ACCOUNT */}
                                <div className="review-card">
                                    <div className="review-card-header">
                                        <div>
                                            <span>
                                                ACCOUNT
                                            </span>

                                            <h4>
                                                Login credentials
                                            </h4>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setStep(
                                                    3
                                                )
                                            }
                                        >
                                            Edit
                                        </button>
                                    </div>

                                    <div className="review-grid">
                                        <div>
                                            <small>
                                                Email
                                            </small>

                                            <strong>
                                                {email ||
                                                    "\u2014"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Password
                                            </small>

                                            <strong>
                                                ••••••••
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                <div className="review-card">
                                    <div className="review-card-header">
                                        <div><span>VERIFICATION</span><h4>Uploaded documents</h4></div>
                                        <button type="button" onClick={() => setStep(verificationStep)}>Edit</button>
                                    </div>
                                    <div className="review-grid">
                                        <div><small>Valid ID</small><strong>{validId?.name || "Not uploaded"}</strong></div>
                                        {["seller", "logistics"].includes(registrationRole) && <div><small>Business / DTI Permit</small><strong>{businessPermit?.name || "Not uploaded"}</strong></div>}
                                        {registrationRole === "rider" && <><div><small>Driver's License</small><strong>{driversLicense?.name || "Not uploaded"}</strong></div><div><small>OR/CR</small><strong>{orCr?.name || "Not uploaded"}</strong></div></>}
                                    </div>
                                </div>

                                {["seller", "logistics"].includes(registrationRole) && <div className="review-card"><div className="review-card-header"><div><span>{registrationRole === "logistics" ? "LOGISTICS" : "SELLER"}</span><h4>Business information</h4></div><button type="button" onClick={() => setStep(roleInfoStep)}>Edit</button></div><div className="review-grid"><div><small>Business Name</small><strong>{businessName || "—"}</strong></div>{registrationRole === "seller" && <div><small>Line of Business / Category</small><strong>{lineOfBusiness || "—"}</strong></div>}</div></div>}
                                {registrationRole === "rider" && <div className="review-card"><div className="review-card-header"><div><span>COURIER</span><h4>Vehicle information</h4></div><button type="button" onClick={() => setStep(roleInfoStep)}>Edit</button></div><div className="review-grid"><div><small>Vehicle</small><strong>{vehicleType || "—"}</strong></div><div><small>Plate Number</small><strong>{plateNumber || "—"}</strong></div></div></div>}

                                <div className="policy-acceptance-card" aria-labelledby="policy-acceptance-heading">
                                    <h4 id="policy-acceptance-heading">Review CRYMA’s terms and privacy notice</h4>
                                    <label className="policy-acceptance-option">
                                        <input type="checkbox" checked={termsAccepted} onChange={(event) => { setTermsAccepted(event.target.checked); setAcceptanceError(""); }} />
                                        <span>I have read and agree to the <Link to="/terms" target="_blank" rel="noreferrer">Terms and Conditions</Link> (version {POLICY_VERSIONS.terms}).</span>
                                    </label>
                                    <label className="policy-acceptance-option">
                                        <input type="checkbox" checked={privacyAcknowledged} onChange={(event) => { setPrivacyAcknowledged(event.target.checked); setAcceptanceError(""); }} />
                                        <span>I acknowledge that I have read the <Link to="/privacy" target="_blank" rel="noreferrer">Privacy Notice</Link> (version {POLICY_VERSIONS.privacy}), including its notice about identity and verification documents.</span>
                                    </label>
                                    {acceptanceError && <small className="registration-field-error" role="alert">{acceptanceError}</small>}
                                </div>

                            </section>
                        )}

                        {/* =========================
                            NAVIGATION
                        ========================== */}
                        <div className="register-actions">
                            {step > 1 ? (
                                <button
                                    type="button"
                                    className="secondary-action"
                                    onClick={
                                        handleBack
                                    }
                                    disabled={
                                        loading
                                    }
                                >
                                    Back
                                </button>
                            ) : embedded ? (
                                <button
                                    type="button"
                                    className="secondary-action"
                                    onClick={onSwitchToLogin}
                                >
                                    Sign in instead
                                </button>
                            ) : (
                                <Link
                                    to="/login"
                                    className="secondary-action"
                                >
                                    Sign in instead
                                </Link>
                            )}

                            {step < reviewStep ? (
                                <button
                                    type="submit"
                                    className="primary-action"
                                    disabled={loading || Object.keys(currentStepErrors).length > 0}
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="primary-action"
                                    disabled={
                                        loading
                                    }
                                >
                                    {loading ? (
                                        <>
                                            <span className="button-spinner" />
                                            Submitting application...
                                        </>
                                    ) : (
                                                "Submit application"
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                        </>
                    )}
                </main>
        </div>
    );
    return embedded ? content : <AuthShell visualProps={{ visual: registrationVisual }}>{content}</AuthShell>;
}

export default Register;
