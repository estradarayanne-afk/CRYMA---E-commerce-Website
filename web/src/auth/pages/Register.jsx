import { useCallback, useRef, useState } from "react";
import {
    Navigate,
    Link,
    useLocation,
    useParams,
} from "react-router-dom";
import api from "../../shared/services/api";
import { PRODUCT_CATEGORIES } from "../../shared/constants/categories";
import { LANDING_VISUALS } from "../../shared/constants/landingVisuals";
import PhilippineAddressFields from "../components/PhilippineAddressFields";
import AuthShell from "../components/AuthShell";
import "./Register.css";
import "../styles/AuthPages.css";

function DocumentUploadField({ id, label, file, onSelect, onRemove }) {
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

    const registrationRole = ["seller", "rider"].includes(role)
        ? role
        : "buyer";
    const accountType = registrationRole === "rider"
        ? "Courier"
        : registrationRole.charAt(0).toUpperCase() + registrationRole.slice(1);
    const registrationVisual = LANDING_VISUALS.hero;

    // SELLER
    const [businessName, setBusinessName] = useState("");
    const [lineOfBusiness, setLineOfBusiness] = useState("");
    const [businessPermit, setBusinessPermit] = useState(null);
    const [vehicleType, setVehicleType] = useState("");
    const [plateNumber, setPlateNumber] = useState("");
    const [orCr, setOrCr] = useState(null);

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const submitButtonClicked = useRef(false);

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
        ...(registrationRole === "seller" ? [{ number: 4, label: "Business" }] : []),
        ...(registrationRole === "rider" ? [{ number: 4, label: "Vehicle" }] : []),
        { number: verificationStep, label: "Verification" },
        { number: reviewStep, label: "Review" },
    ];

    // =========================
    // AGE
    // =========================
    const calculateAge = (birthdate) => {
        if (!birthdate) return "";

        const today = new Date();
        const birth = new Date(`${birthdate}T00:00:00`);

        let years =
            today.getFullYear() -
            birth.getFullYear();

        const monthDiff =
            today.getMonth() -
            birth.getMonth();

        if (
            monthDiff < 0 ||
            (
                monthDiff === 0 &&
                today.getDate() < birth.getDate()
            )
        ) {
            years--;
        }

        return years >= 0 ? years : "";
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
    const validateStep = () => {
        setError("");

        // STEP 1
        if (step === 1) {
            if (
                !firstName.trim() ||
                !lastName.trim() ||
                !birthDate ||
                !sex
            ) {
                setError(
                    "Please complete all required personal information."
                );

                return false;
            }

        }

        // STEP 2
        if (step === 2) {
            if (
                !phone.trim() ||
                !province ||
                !municipality ||
                !barangay
            ) {
                setError(
                    "Please complete your contact and Philippine address."
                );

                return false;
            }

            if (!postalCode.trim()) {
                setError(
                    "Postal code could not be determined for this address. Please reselect your municipality or contact support."
                );

                return false;
            }

            if (!houseNumber.trim() || !street.trim()) {
                setError(
                    "Please enter both your house number and street."
                );

                return false;
            }
        }

        // STEP 3
        if (step === 3) {
            if (!email.trim() || !password) {
                setError(
                    "Please provide your email and password."
                );

                return false;
            }

            if (password.length < 8) {
                setError(
                    "Password must be at least 8 characters."
                );

                return false;
            }

            if (
                password !== passwordConfirmation
            ) {
                setError(
                    "Passwords do not match."
                );

                return false;
            }
        }

        if (step === roleInfoStep && registrationRole === "seller") {
            if (!businessName.trim() || !lineOfBusiness) {
                setError("Complete your business name and category.");
                return false;
            }
        }

        if (step === roleInfoStep && registrationRole === "rider") {
            if (!vehicleType || !plateNumber.trim()) {
                setError("Complete your vehicle type and plate number.");
                return false;
            }
        }

        if (step === verificationStep) {
            if (!validId) {
                setError("Please upload a valid ID before submitting your application.");
                return false;
            }
            if (registrationRole === "seller" && !businessPermit) {
                setError("Please upload your business permit.");
                return false;
            }
            if (registrationRole === "rider" && !orCr) {
                setError("Please upload your vehicle OR/CR.");
                return false;
            }
        }

        return true;
    };

    // =========================
    // NEXT
    // =========================
    const handleNext = () => {
        if (!validateStep()) {
            return;
        }

        setStep((current) =>
            Math.min(current + 1, reviewStep)
        );

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

        if (!submitButtonClicked.current || step !== reviewStep) {
            submitButtonClicked.current = false;
            return;
        }
        submitButtonClicked.current = false;

        setError("");

        if (!validateStep()) {
            return;
        }

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
                phone.trim()
            );

            // ROLE
            formData.append("role", registrationRole);

            if (registrationRole === "seller") {
                formData.append(
                    "business_name",
                    businessName.trim()
                );

                formData.append(
                    "line_of_business",
                    lineOfBusiness.trim()
                );

                formData.append(
                    "business_permit",
                    businessPermit
                );
            }

            if (registrationRole === "rider") {
                formData.append("vehicle_type", vehicleType);
                formData.append("plate_number", plateNumber.trim());
                formData.append("or_cr", orCr);
                // The current API requires both fields for rider registrations.
                // One driver's license image satisfies the shared valid ID and
                // courier driver's license document requirements.
                formData.append("drivers_license", validId);
            }

            // ADDRESS
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
        } catch (err) {
            console.error(
                "Registration error:",
                err
            );

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
            submitButtonClicked.current = false;
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
    const latestBirthday = new Date();
    latestBirthday.setDate(latestBirthday.getDate() - 1);
    const maxBirthday = [
        latestBirthday.getFullYear(),
        String(latestBirthday.getMonth() + 1).padStart(2, "0"),
        String(latestBirthday.getDate()).padStart(2, "0"),
    ].join("-");

    if (routeRole && !location.state?.accountTypeSelected) {
        return <Navigate to="/register" replace />;
    }

    const content = (
        <div className={`register-page ${embedded ? "embedded" : ""}`}>

                {/* =========================
                    FORM PANEL
                ========================== */}
                <main className="register-content">
                    {submitted ? (
                        <section className="register-submission-success" role="status">
                            <span className="register-success-mark" aria-hidden="true">✓</span>
                            <span className="register-success-eyebrow">APPLICATION RECEIVED</span>
                            <h2>{registrationRole === "rider" ? "Pending Logistics/Sorting Center Approval" : "Pending Administrator Approval"}</h2>
                            <p>
                                After submitting your registration, please wait for {registrationRole === "rider" ? "the Logistics/Sorting Center's" : "the administrator's"} approval, which will be sent to your email.
                            </p>
                            <Link to="/" className="primary-action">Return to CRYMA</Link>
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
                        onSubmit={
                            handleRegister
                        }
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
                                            value={
                                                firstName
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setFirstName(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            placeholder="Enter first name"
                                        />
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Middle Initial
                                        </label>

                                        <input
                                            type="text"
                                            value={
                                                middleName
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setMiddleName(
                                                    e.target
                                                        .value
                                                )
                                            }
                                                placeholder="e.g. A"
                                                maxLength={1}
                                        />
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
                                            value={
                                                lastName
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setLastName(
                                                    e.target
                                                        .value
                                                )
                                            }
                                            placeholder="Enter last name"
                                        />
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Birthday
                                            <b>*</b>
                                        </label>

                                        <input
                                            type="date"
                                                max={maxBirthday}
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

                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={(
                                            e
                                        ) =>
                                            setPhone(
                                                e.target
                                                    .value
                                            )
                                        }
                                        placeholder="09XXXXXXXXX"
                                    />
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
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Street <b>*</b>
                                        </label>

                                        <input
                                            type="text"
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
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Unit / Floor
                                        </label>

                                        <input
                                            type="text"
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
                                    </div>
                                </div>

                                <div className="auth-field">
                                    <label htmlFor="registration-postal-code">Postal Code <span className="auto-generated-label">Auto-generated</span></label>
                                    <input id="registration-postal-code" type="text" value={postalCode} readOnly placeholder={municipality ? "Postal code unavailable" : "Select municipality"} aria-readonly="true" />
                                    <small className="field-hint">{postalCode ? "Auto-generated from selected address" : municipality ? "Postal code unavailable for this municipality" : "Automatically filled when available"}</small>
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

                        {roleInfoStep === 4 && step === 4 && registrationRole === "seller" && (
                            <section className="register-section">
                                <div className="section-heading"><span>STEP 04</span><h3>Business information</h3><p>Tell us about the store you are applying to operate.</p></div>
                                <div className="review-card seller-registration-card">
                                    <div className="auth-field"><label htmlFor="business-name">Business Name <b>*</b></label><input id="business-name" type="text" value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Enter your business name" /></div>
                                    <div className="auth-field"><label htmlFor="line-of-business">Line of Business / Category <b>*</b></label><select id="line-of-business" value={lineOfBusiness} onChange={(event) => setLineOfBusiness(event.target.value)}><option value="">Select a category</option>{PRODUCT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
                                </div>
                            </section>
                        )}

                        {roleInfoStep === 4 && step === 4 && registrationRole === "rider" && (
                            <section className="register-section">
                                <div className="section-heading"><span>STEP 04</span><h3>Vehicle information</h3><p>Tell us which vehicle you will use for CRYMA deliveries.</p></div>
                                <div className="review-card seller-registration-card form-grid two">
                                    <div className="auth-field"><label htmlFor="vehicle-type">Choose Vehicle <b>*</b></label><select id="vehicle-type" value={vehicleType} onChange={(event) => setVehicleType(event.target.value)}><option value="">Select vehicle</option><option value="motorcycle">Motorcycle</option><option value="tricycle">Tricycle</option><option value="car">Car</option><option value="van">Van</option><option value="truck">Truck</option></select></div>
                                    <div className="auth-field"><label htmlFor="plate-number">Plate Number <b>*</b></label><input id="plate-number" type="text" value={plateNumber} onChange={(event) => setPlateNumber(event.target.value)} placeholder="Enter vehicle plate number" /></div>
                                </div>
                            </section>
                        )}

                        {step === verificationStep && (
                            <section className="register-section">
                                <div className="section-heading"><span>STEP {String(verificationStep).padStart(2, "0")}</span><h3>Verification documents</h3><p>Upload clear images or PDF files of the documents required for your {accountType.toLowerCase()} application.</p></div>
                                <div className="review-card seller-registration-card">
                                    <DocumentUploadField id="valid-id" label={registrationRole === "rider" ? "Upload Valid ID / Driver’s License" : "Upload Valid ID"} file={validId} onSelect={handleValidIdChange} onRemove={() => setValidId(null)} />
                                    {registrationRole === "seller" && <DocumentUploadField id="business-permit" label="Upload Business Permit" file={businessPermit} onSelect={(event) => handleDocumentChange(event, setBusinessPermit, "Business Permit")} onRemove={() => setBusinessPermit(null)} />}
                                    {registrationRole === "rider" && <DocumentUploadField id="or-cr" label="Upload OR/CR" file={orCr} onSelect={(event) => handleDocumentChange(event, setOrCr, "OR/CR")} onRemove={() => setOrCr(null)} />}
                                </div>
                            </section>
                        )}

                        {step === reviewStep && (
                            <section className="register-section">
                                <div className="section-heading"><span>STEP {String(reviewStep).padStart(2, "0")}</span><h3>Review your application</h3><p>Confirm your information and uploaded documents before submitting.</p></div>
                                <div className="registration-note" role="note"><span aria-hidden="true">i</span><p>After submitting your registration, please wait for {registrationRole === "rider" ? "the Logistics/Sorting Center's" : "the administrator's"} approval, which will be sent to your email.</p></div>

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
                                                {phone ||
                                                    "\u2014"}
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
                                        <div><small>{registrationRole === "rider" ? "Valid ID / Driver’s License" : "Valid ID"}</small><strong>{validId?.name || "Not uploaded"}</strong></div>
                                        {registrationRole === "seller" && <div><small>Business Permit</small><strong>{businessPermit?.name || "Not uploaded"}</strong></div>}
                                        {registrationRole === "rider" && <div><small>OR/CR</small><strong>{orCr?.name || "Not uploaded"}</strong></div>}
                                    </div>
                                </div>

                                {registrationRole === "seller" && <div className="review-card"><div className="review-card-header"><div><span>SELLER</span><h4>Business information</h4></div><button type="button" onClick={() => setStep(roleInfoStep)}>Edit</button></div><div className="review-grid"><div><small>Business Name</small><strong>{businessName || "—"}</strong></div><div><small>Line of Business / Category</small><strong>{lineOfBusiness || "—"}</strong></div></div></div>}
                                {registrationRole === "rider" && <div className="review-card"><div className="review-card-header"><div><span>COURIER</span><h4>Vehicle information</h4></div><button type="button" onClick={() => setStep(roleInfoStep)}>Edit</button></div><div className="review-grid"><div><small>Vehicle</small><strong>{vehicleType || "—"}</strong></div><div><small>Plate Number</small><strong>{plateNumber || "—"}</strong></div></div></div>}

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
                                    type="button"
                                    className="primary-action"
                                    onClick={
                                        handleNext
                                    }
                                >
                                    Continue
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="primary-action"
                                    onClick={(event) => {
                                        submitButtonClicked.current =
                                            event.detail > 0 ||
                                            document.activeElement === event.currentTarget;
                                    }}
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
