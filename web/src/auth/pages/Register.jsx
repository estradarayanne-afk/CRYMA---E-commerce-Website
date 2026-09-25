import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../shared/services/api";
import PhilippineAddressFields from "../components/PhilippineAddressFields";
import "./Register.css";

function Register() {
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

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
        {
            number: 4,
            label: "Review",
        },
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
    const handleAddressChange = ({
        region: newRegion,
        province: newProvince,
        city: newCity,
        barangay: newBarangay,
    }) => {
        setRegion(newRegion);
        setProvince(newProvince);
        setMunicipality(newCity);
        setBarangay(newBarangay);
    };

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

            if (age !== "" && Number(age) < 18) {
                setError(
                    "You must be at least 18 years old to register."
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

            if (
                !houseNumber.trim() &&
                !street.trim() &&
                !buildingName.trim() &&
                !unitNumber.trim()
            ) {
                setError(
                    "Please provide at least your house number, street, building, or unit details."
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

        // STEP 4
        if (step === 4) {
            if (!validId) {
                setError(
                    "Please upload a valid ID before creating your account."
                );

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
            Math.min(current + 1, 4)
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
    const handleValidIdChange = (event) => {
        const file = event.target.files?.[0];

        if (!file) {
            setValidId(null);
            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf",
        ];

        if (!allowedTypes.includes(file.type)) {
            setError(
                "Valid ID must be a JPG, JPEG, PNG, or PDF file."
            );

            event.target.value = "";
            setValidId(null);

            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError(
                "Valid ID must not exceed 5MB."
            );

            event.target.value = "";
            setValidId(null);

            return;
        }

        setError("");
        setValidId(file);
    };

    // =========================
    // REGISTER
    // =========================
    const handleRegister = async (event) => {
        event.preventDefault();

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
            // This registration page is for BUYERS.
            formData.append(
                "role",
                "buyer"
            );

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

            window.alert(
                "Registration submitted successfully! Please check your email for the next verification step."
            );

            navigate("/verify-otp", {
                state: {
                    email:
                        email
                            .trim()
                            .toLowerCase(),
                },
            });
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

    return (
        <div className="register-page">
            <div className="register-shell">

                {/* =========================
                    LEFT BRAND PANEL
                ========================== */}
                <aside className="register-brand">
                    <Link
                        to="/"
                        className="register-logo"
                    >
                        <span className="register-logo-mark">
                            C
                        </span>

                        <span>CRYMA</span>
                    </Link>

                    <div className="register-brand-content">
                        <span className="register-eyebrow">
                            JOIN CRYMA
                        </span>

                        <h1>
                            Create your
                            <br />
                            CRYMA account.
                        </h1>

                        <p>
                            Shop, track your orders,
                            communicate with sellers,
                            and manage your account
                            in one place.
                        </p>
                    </div>

                    <div className="register-brand-footer">
                        <span>
                            Already have an account?
                        </span>

                        <Link to="/login">
                            Sign in
                        </Link>
                    </div>
                </aside>

                {/* =========================
                    FORM PANEL
                ========================== */}
                <main className="register-content">

                    <div className="register-top">
                        <div>
                            <span className="register-mobile-eyebrow">
                                CRYMA ACCOUNT
                            </span>

                            <h2>
                                Create account
                            </h2>

                            <p>
                                Complete the information
                                below to get started.
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
                                                ? "✓"
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
                                            First name
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
                                            Middle name
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
                                            placeholder="Enter middle name"
                                        />
                                    </div>
                                </div>

                                <div className="form-grid two">
                                    <div className="auth-field">
                                        <label>
                                            Last name
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
                                            Age
                                        </label>

                                        <div className="readonly-field">
                                            {age
                                                ? `${age} years old`
                                                : "Automatically calculated"}
                                        </div>
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
                                        Mobile number
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
                                        Select your region,
                                        province, city /
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
                                />

                                <div className="form-grid two">
                                    <div className="auth-field">
                                        <label>
                                            House number
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
                                            Street
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
                                    <label>
                                        Postal code
                                    </label>

                                    <input
                                        type="text"
                                        value={
                                            postalCode
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setPostalCode(
                                                e.target
                                                    .value
                                            )
                                        }
                                        placeholder="Optional"
                                    />
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
                                        Email address
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

                        {/* =========================
                            STEP 4
                        ========================== */}
                        {step === 4 && (
                            <section className="register-section">
                                <div className="section-heading">
                                    <span>
                                        STEP 04
                                    </span>

                                    <h3>
                                        Review & verification
                                    </h3>

                                    <p>
                                        Check your information
                                        and upload your valid
                                        ID before submitting.
                                    </p>
                                </div>

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
                                                    "—"}
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
                                                    : "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Birthday
                                            </small>

                                            <strong>
                                                {birthDate ||
                                                    "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Age
                                            </small>

                                            <strong>
                                                {age
                                                    ? `${age} years old`
                                                    : "—"}
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
                                                    "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Province
                                            </small>

                                            <strong>
                                                {province ||
                                                    "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Municipality
                                            </small>

                                            <strong>
                                                {municipality ||
                                                    "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Barangay
                                            </small>

                                            <strong>
                                                {barangay ||
                                                    "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                House number
                                            </small>

                                            <strong>
                                                {houseNumber ||
                                                    "—"}
                                            </strong>
                                        </div>

                                        <div>
                                            <small>
                                                Street
                                            </small>

                                            <strong>
                                                {street ||
                                                    "—"}
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
                                                    "—"}
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

                                {/* VALID ID */}
                                <div className="review-card">
                                    <div className="review-card-header">
                                        <div>
                                            <span>
                                                VERIFICATION
                                            </span>

                                            <h4>
                                                Valid ID
                                            </h4>
                                        </div>
                                    </div>

                                    <div className="auth-field">
                                        <label>
                                            Upload valid ID
                                            <b>*</b>
                                        </label>

                                        <input
                                            type="file"
                                            accept=".jpg,.jpeg,.png,.pdf"
                                            onChange={
                                                handleValidIdChange
                                            }
                                        />

                                        <small className="file-help">
                                            Accepted:
                                            JPG, JPEG,
                                            PNG or PDF.
                                            Maximum
                                            file size:
                                            5MB.
                                        </small>

                                        {validId && (
                                            <div className="selected-file">
                                                ✓{" "}
                                                {validId.name}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="registration-note">
                                    <span>
                                        ✓
                                    </span>

                                    <p>
                                        Your registration
                                        will be submitted
                                        for verification.
                                        CRYMA can review
                                        the submitted
                                        information and
                                        identification
                                        document before
                                        activating the
                                        account.
                                    </p>
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
                            ) : (
                                <Link
                                    to="/login"
                                    className="secondary-action"
                                >
                                    Sign in instead
                                </Link>
                            )}

                            {step < 4 ? (
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
                                    disabled={
                                        loading
                                    }
                                >
                                    {loading ? (
                                        <>
                                            <span className="button-spinner" />
                                            Creating account...
                                        </>
                                    ) : (
                                        "Create account"
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </main>
            </div>
        </div>
    );
}

export default Register;