import { useEffect, useState } from "react";
import { getPhilPostPostalCode } from "../utils/postalCode";

const API_BASE = "https://psgc.cloud/api/v2";

function PhilippineAddressFields({
    region,
    province,
    city,
    barangay,
    errors = {},
    onChange,
    onPostalCodeChange,
    hydrateExisting = false,
    disabled = false,
}) {
    const [regions, setRegions] = useState([]);
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [barangays, setBarangays] = useState([]);

    const [regionCode, setRegionCode] = useState("");
    const [provinceCode, setProvinceCode] = useState("");
    const [cityCode, setCityCode] = useState("");

    const [loadingRegions, setLoadingRegions] = useState(false);
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [loadingBarangays, setLoadingBarangays] = useState(false);

    const [addressError, setAddressError] = useState("");

    // =========================
    // LOAD REGIONS
    // =========================

    useEffect(() => {
        let cancelled = false;

        const loadRegions = async () => {
            setLoadingRegions(true);
            setAddressError("");

            try {
                const response = await fetch(
                    `${API_BASE}/regions`
                );

                if (!response.ok) {
                    throw new Error(
                        "Unable to load regions."
                    );
                }

                const result = await response.json();

                if (!cancelled) {
                    const loadedRegions = Array.isArray(result?.data) ? result.data : [];
                    setRegions(loadedRegions);
                    const savedRegion = hydrateExisting && loadedRegions.find((item) => item.name === region);
                    if (savedRegion) setRegionCode(String(savedRegion.code));
                }
            } catch (error) {
                console.error(
                    "Regions API error:",
                    error
                );

                if (!cancelled) {
                    setAddressError(
                        "Unable to load Philippine regions."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingRegions(false);
                }
            }
        };

        loadRegions();

        return () => {
            cancelled = true;
        };
    }, [region, hydrateExisting]);

    // =========================
    // LOAD PROVINCES
    // =========================

    useEffect(() => {
        let cancelled = false;

        if (!regionCode) {
            return;
        }

        const loadProvinces = async () => {
            setLoadingProvinces(true);
            setAddressError("");

            try {
                const response = await fetch(
                    `${API_BASE}/regions/${encodeURIComponent(
                        regionCode
                    )}/provinces`
                );

                if (!response.ok) {
                    throw new Error(
                        "Unable to load provinces."
                    );
                }

                const result = await response.json();

                if (!cancelled) {
                    const loadedProvinces = Array.isArray(result?.data) ? result.data : [];
                    setProvinces(loadedProvinces);
                    const savedProvince = hydrateExisting && loadedProvinces.find((item) => item.name === province);
                    if (savedProvince) setProvinceCode(String(savedProvince.code));
                }
            } catch (error) {
                console.error(
                    "Provinces API error:",
                    error
                );

                if (!cancelled) {
                    setAddressError(
                        "Unable to load provinces."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingProvinces(false);
                }
            }
        };

        loadProvinces();

        return () => {
            cancelled = true;
        };
    }, [regionCode, province, hydrateExisting]);

    // =========================
    // LOAD CITIES / MUNICIPALITIES
    // =========================

    useEffect(() => {
        let cancelled = false;

        if (!regionCode || !provinceCode) {
            return;
        }

        const loadCities = async () => {
            setLoadingCities(true);
            setAddressError("");

            try {
                const response = await fetch(
                    `${API_BASE}/regions/${encodeURIComponent(
                        regionCode
                    )}/provinces/${encodeURIComponent(
                        provinceCode
                    )}/cities-municipalities`
                );

                if (!response.ok) {
                    throw new Error(
                        "Unable to load cities."
                    );
                }

                const result = await response.json();

                if (!cancelled) {
                    const loadedCities = Array.isArray(result?.data) ? result.data : [];
                    setCities(loadedCities);
                    const savedCity = hydrateExisting && loadedCities.find((item) => item.name === city);
                    if (savedCity) setCityCode(String(savedCity.code));
                }
            } catch (error) {
                console.error(
                    "Cities API error:",
                    error
                );

                if (!cancelled) {
                    setAddressError(
                        "Unable to load cities and municipalities."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingCities(false);
                }
            }
        };

        loadCities();

        return () => {
            cancelled = true;
        };
    }, [regionCode, provinceCode, city, hydrateExisting]);

    // =========================
    // LOAD BARANGAYS
    // =========================

    useEffect(() => {
        let cancelled = false;

        if (
            !regionCode ||
            !provinceCode ||
            !cityCode
        ) {
            return;
        }

        const loadBarangays = async () => {
            setLoadingBarangays(true);
            setAddressError("");

            try {
                const response = await fetch(
                    `${API_BASE}/regions/${encodeURIComponent(
                        regionCode
                    )}/provinces/${encodeURIComponent(
                        provinceCode
                    )}/cities-municipalities/${encodeURIComponent(
                        cityCode
                    )}/barangays`
                );

                if (!response.ok) {
                    throw new Error(
                        "Unable to load barangays."
                    );
                }

                const result = await response.json();

                if (!cancelled) {
                    setBarangays(
                        Array.isArray(result?.data)
                            ? result.data
                            : []
                    );
                }
            } catch (error) {
                console.error(
                    "Barangays API error:",
                    error
                );

                if (!cancelled) {
                    setAddressError(
                        "Unable to load barangays."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingBarangays(false);
                }
            }
        };

        loadBarangays();

        return () => {
            cancelled = true;
        };
    }, [
        regionCode,
        provinceCode,
        cityCode,
    ]);

    // =========================
    // REGION CHANGE
    // =========================

    const handleRegionChange = (event) => {
        const selectedCode = event.target.value;

        const selectedRegion = regions.find(
            (item) => String(item.code) === String(selectedCode)
        );

        setRegionCode(selectedCode);
        setProvinceCode("");
        setCityCode("");
        setProvinces([]);
        setCities([]);
        setBarangays([]);
        setLoadingProvinces(false);
        setLoadingCities(false);
        setLoadingBarangays(false);
        setAddressError("");
        onPostalCodeChange?.("");

        onChange({
            region: selectedRegion?.name || "",
            province: "",
            city: "",
            barangay: "",
        });
    };

    // =========================
    // PROVINCE CHANGE
    // =========================

    const handleProvinceChange = (event) => {
        const selectedCode = event.target.value;

        const selectedProvince = provinces.find(
            (item) => String(item.code) === String(selectedCode)
        );

        setProvinceCode(selectedCode);
        setCityCode("");
        setCities([]);
        setBarangays([]);
        setLoadingCities(false);
        setLoadingBarangays(false);
        setAddressError("");
        onPostalCodeChange?.("");

        onChange({
            region,
            province: selectedProvince?.name || "",
            city: "",
            barangay: "",
        });
    };

    // =========================
    // CITY CHANGE
    // =========================

    const handleCityChange = (event) => {
        const selectedCode = event.target.value;

        const selectedCity = cities.find(
            (item) => String(item.code) === String(selectedCode)
        );

        setCityCode(selectedCode);
        onPostalCodeChange?.(getPhilPostPostalCode(province, selectedCity?.name));
        setBarangays([]);
        setLoadingBarangays(false);
        setAddressError("");

        onChange({
            region,
            province,
            city: selectedCity?.name || "",
            barangay: "",
        });
    };

    // =========================
    // BARANGAY CHANGE
    // =========================

    const handleBarangayChange = (event) => {
        const selectedCode = event.target.value;

        const selectedBarangay = barangays.find(
            (item) => item.code === selectedCode
        );

        const selectedCity = cities.find(
            (item) => String(item.code) === String(cityCode)
        );

        onPostalCodeChange?.(getPhilPostPostalCode(province, selectedCity?.name));

        onChange({
            region,
            province,
            city,
            barangay:
                selectedBarangay?.name || "",
        });
    };

    return (
        <div className="address-fields">

            <div className="address-grid">

                {/* REGION */}
                <div className="auth-field">
                    <label htmlFor="region">
                        Region
                    </label>

                    <select
                        id="region"
                        required
                        aria-invalid={Boolean(errors.region)}
                        value={regionCode}
                        onChange={handleRegionChange}
                        disabled={disabled || loadingRegions}
                    >
                        <option value="">
                            {loadingRegions
                                ? "Loading regions..."
                                : "Select region"}
                        </option>

                        {regions.map((item) => (
                            <option
                                key={item.code}
                                value={item.code}
                            >
                                {item.name}
                            </option>
                        ))}
                    </select>
                    {errors.region && <small className="registration-field-error">{errors.region}</small>}
                </div>

                {/* PROVINCE */}
                <div className="auth-field">
                    <label htmlFor="province">
                        Province <b>*</b>
                    </label>

                    <select
                        id="province"
                        required
                        aria-invalid={Boolean(errors.province)}
                        value={provinceCode}
                        onChange={handleProvinceChange}
                        disabled={
                            disabled ||
                            !regionCode ||
                            loadingProvinces
                        }
                    >
                        <option value="">
                            {!regionCode
                                ? "Select region first"
                                : loadingProvinces
                                    ? "Loading provinces..."
                                    : "Select province"}
                        </option>

                        {provinces.map((item) => (
                            <option
                                key={item.code}
                                value={item.code}
                            >
                                {item.name}
                            </option>
                        ))}
                    </select>
                    {errors.province && <small className="registration-field-error">{errors.province}</small>}
                </div>

                {/* CITY / MUNICIPALITY */}
                <div className="auth-field">
                    <label htmlFor="city">
                        Municipality <b>*</b>
                    </label>

                    <select
                        id="city"
                        required
                        aria-invalid={Boolean(errors.municipality)}
                        value={cityCode}
                        onChange={handleCityChange}
                        disabled={
                            disabled ||
                            !provinceCode ||
                            loadingCities
                        }
                    >
                        <option value="">
                            {!provinceCode
                                ? "Select province first"
                                : loadingCities
                                    ? "Loading cities..."
                                    : "Select city / municipality"}
                        </option>

                        {cities.map((item) => (
                            <option
                                key={item.code}
                                value={item.code}
                            >
                                {item.name}
                            </option>
                        ))}
                    </select>
                    {errors.municipality && <small className="registration-field-error">{errors.municipality}</small>}
                </div>

                {/* BARANGAY */}
                <div className="auth-field">
                    <label htmlFor="barangay">
                        Barangay <b>*</b>
                    </label>

                        <select
                            id="barangay"
                            required
                            aria-invalid={Boolean(errors.barangay)}
                            value={
                                barangays.find(
                                    (item) => item.name === barangay
                                )?.code || ""
                            }
                            onChange={handleBarangayChange}
                            disabled={
                                disabled ||
                                !cityCode ||
                                loadingBarangays
                            }
                        >
                        <option value="">
                            {!cityCode
                                ? "Select city / municipality first"
                                : loadingBarangays
                                    ? "Loading barangays..."
                                    : "Select barangay"}
                        </option>

                        {barangays.map((item) => (
                            <option
                                key={item.code}
                                value={item.code}
                            >
                                {item.name}
                            </option>
                        ))}
                    </select>
                    {errors.barangay && <small className="registration-field-error">{errors.barangay}</small>}
                </div>

            </div>

            {addressError && (
                <div className="address-api-error">
                    {addressError}
                </div>
            )}

        </div>
    );
}

export default PhilippineAddressFields;
