import PhilippineAddressFields from "../../auth/components/PhilippineAddressFields";
import "./BuyerAddressForm.css";

const detailFields = [
    { name: "house_number", label: "House / lot number", maxLength: 20 },
    { name: "building_name", label: "Building name", maxLength: 80 },
    { name: "unit_number", label: "Unit / floor", maxLength: 30 },
    { name: "street", label: "Street", maxLength: 100 },
];

function BuyerAddressForm({ address, errors = {}, onChange, disabled = false, showDefault = false, grouped = false, lockRecipientDetails = false }) {
    const update = (field, value) => onChange((current) => ({ ...current, [field]: value }));

    const recipientFields = (
        <div className="buyer-address-form-grid">
            <label>
                    Address label
                    <select value={address.label} onChange={(event) => update("label", event.target.value)} disabled={disabled}>
                        <option value="home">Home</option>
                        <option value="work">Work</option>
                        <option value="other">Other</option>
                    </select>
                    {errors.label && <small className="buyer-address-field-error">{errors.label}</small>}
            </label>
            <label>
                    Recipient name
                    <input value={address.recipient_name} onChange={(event) => update("recipient_name", event.target.value)} maxLength={100} autoComplete="name" disabled={disabled} readOnly={lockRecipientDetails} aria-readonly={lockRecipientDetails} title={lockRecipientDetails ? "Managed in your buyer profile" : undefined} />
                    {lockRecipientDetails && <small className="buyer-address-readonly-note">Managed in your buyer profile</small>}
                    {errors.recipient_name && <small className="buyer-address-field-error">{errors.recipient_name}</small>}
            </label>
            <label>
                    Contact number
                    <input type="tel" inputMode="tel" value={address.phone} onChange={(event) => update("phone", event.target.value)} maxLength={20} placeholder="09171234567" autoComplete="tel" disabled={disabled} readOnly={lockRecipientDetails} aria-readonly={lockRecipientDetails} title={lockRecipientDetails ? "Managed in your buyer profile" : undefined} />
                    {lockRecipientDetails && <small className="buyer-address-readonly-note">Managed in your buyer profile</small>}
                    {errors.phone && <small className="buyer-address-field-error">{errors.phone}</small>}
            </label>
        </div>
    );

    const streetFields = (
        <div className="buyer-address-form-grid">
            {detailFields.map(({ name, label, maxLength }) => (
                <label key={name}>
                    {label}{name === "street" ? "" : " (optional)"}
                    <input value={address[name]} onChange={(event) => update(name, event.target.value)} maxLength={maxLength} disabled={disabled} />
                    {errors[name] && <small className="buyer-address-field-error">{errors[name]}</small>}
                </label>
            ))}
        </div>
    );

    const locationFields = (
        <>
            <PhilippineAddressFields
                region={address.region}
                province={address.province}
                city={address.municipality}
                barangay={address.barangay}
                errors={errors}
                hydrateExisting
                disabled={disabled}
                onChange={(location) => onChange((current) => ({
                    ...current,
                    region: location.region,
                    province: location.province,
                    municipality: location.city,
                    barangay: location.barangay,
                }))}
                onPostalCodeChange={(postal_code) => onChange((current) => ({ ...current, postal_code }))}
            />

            <label className="buyer-address-postal">
                Postal code (optional)
                <input
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={address.postal_code}
                    onChange={(event) => update("postal_code", event.target.value)}
                    disabled={disabled}
                />
                {errors.postal_code && <small className="buyer-address-field-error">{errors.postal_code}</small>}
            </label>

            {showDefault && (
                <label className="buyer-address-default-toggle">
                    <input type="checkbox" checked={Boolean(address.is_default)} onChange={(event) => update("is_default", event.target.checked)} disabled={disabled} />
                    Set as my default delivery address
                </label>
            )}
        </>
    );

    return (
        <div className={`buyer-address-form${grouped ? " is-grouped" : ""}`}>
            {grouped ? (
                <>
                    <section className="buyer-address-group">
                        <div className="buyer-address-group-heading"><span>01</span><div><strong>Recipient details</strong><small>{lockRecipientDetails ? "Name and phone are managed in your buyer profile." : "Who should receive the order?"}</small></div></div>
                        {recipientFields}
                    </section>
                    <section className="buyer-address-group">
                        <div className="buyer-address-group-heading"><span>02</span><div><strong>Street address</strong><small>Add the most specific location details you have.</small></div></div>
                        {streetFields}
                    </section>
                    <section className="buyer-address-group">
                        <div className="buyer-address-group-heading"><span>03</span><div><strong>City and region</strong><small>Select each location in order so the next field can load.</small></div></div>
                        {locationFields}
                    </section>
                </>
            ) : (
                <>
                    {recipientFields}
                    {streetFields}
                    {locationFields}
                </>
            )}
        </div>
    );
}

export default BuyerAddressForm;
