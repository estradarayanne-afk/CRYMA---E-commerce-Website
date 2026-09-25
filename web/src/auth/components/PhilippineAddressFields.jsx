import { useEffect, useState } from "react";

const API_BASE = "https://psgc.cloud/api/v2";

function PhilippineAddressFields({
    region,
    province,
    city,
    barangay,
    onChange,
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
                    setRegions(
                        Array.isArray(result?.data)
                            ? result.data
                            : []
                    );
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
    }, []);

    // =========================
    // LOAD PROVINCES
    // =========================

    useEffect(() => {
        let cancelled = false;

        setProvinces([]);
        setCities([]);
        setBarangays([]);

        setProvinceCode("");
        setCityCode("");

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
                    setProvinces(
                        Array.isArray(result?.data)
                            ? result.data
                            : []
                    );
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
    }, [regionCode]);

    // =========================
    // LOAD CITIES / MUNICIPALITIES
    // =========================

    useEffect(() => {
        let cancelled = false;

        setCities([]);
        setBarangays([]);
        setCityCode("");

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
                    setCities(
                        Array.isArray(result?.data)
                            ? result.data
                            : []
                    );
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
    }, [regionCode, provinceCode]);

    // =========================
    // LOAD BARANGAYS
    // =========================

    useEffect(() => {
        let cancelled = false;

        setBarangays([]);

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
            (item) => item.code === selectedCode
        );

        setRegionCode(selectedCode);

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
            (item) => item.code === selectedCode
        );

        setProvinceCode(selectedCode);

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
            (item) => item.code === selectedCode
        );

        setCityCode(selectedCode);

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
                        value={regionCode}
                        onChange={handleRegionChange}
                        disabled={loadingRegions}
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
                </div>

                {/* PROVINCE */}
                <div className="auth-field">
                    <label htmlFor="province">
                        Province
                    </label>

                    <select
                        id="province"
                        value={provinceCode}
                        onChange={handleProvinceChange}
                        disabled={
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
                </div>

                {/* CITY / MUNICIPALITY */}
                <div className="auth-field">
                    <label htmlFor="city">
                        City / Municipality
                    </label>

                    <select
                        id="city"
                        value={cityCode}
                        onChange={handleCityChange}
                        disabled={
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
                </div>

                {/* BARANGAY */}
                <div className="auth-field">
                    <label htmlFor="barangay">
                        Barangay
                    </label>

                        <select
                            id="barangay"
                            value={
                                barangays.find(
                                    (item) => item.name === barangay
                                )?.code || ""
                            }
                            onChange={handleBarangayChange}
                            disabled={
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