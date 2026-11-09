import { useEffect, useState } from "react";
import api from "../../shared/services/api";
import { getPhilPostPostalCode } from "../utils/postalCode";
import { normalizePsgcPlaceName } from "../utils/normalizePsgcPlaceName";

const normalizePsgcPlaces = (places) =>
    places.map((place) => ({
        ...place,
        name: normalizePsgcPlaceName(place.name),
    }));

const locationNameVariants = (value) => {
    const name = normalizePsgcPlaceName(String(value ?? "")).trim().toLocaleLowerCase();
    const parenthetical = name.match(/\(([^()]*)\)\s*$/u)?.[1]?.trim();

    return new Set([
        name,
        name.replace(/^city of\s+/u, ""),
        name.replace(/\s*\([^()]*\)\s*$/u, "").trim(),
        parenthetical,
    ].filter(Boolean));
};

const findPlace = (places, value) => {
    const variants = locationNameVariants(value);

    return places.find((place) => (
        [...locationNameVariants(place.name)].some((variant) => variants.has(variant))
    ));
};

async function loadPsgcOptions(path) {
    const response = await api.get("/philippine-address-options", { params: { path } });
    const options = response?.data?.data;
    if (!Array.isArray(options)) throw new Error("Philippine address options are unavailable.");
    return normalizePsgcPlaces(options);
}

function PhilippineAddressFields({
    region,
    province,
    city,
    barangay,
    psgcCode = "",
    errors = {},
    onChange,
    onPostalCodeChange,
    onProvinceRequirementChange,
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
                const loadedRegions = await loadPsgcOptions("regions");

                if (!cancelled) {
                    setRegions(loadedRegions);
                    const savedRegion = hydrateExisting && findPlace(loadedRegions, region);
                    if (savedRegion) {
                        setRegionCode(String(savedRegion.code));
                        if (region !== savedRegion.name) {
                            onChange({
                                region: savedRegion.name,
                                province,
                                city,
                                barangay,
                                psgc_code: psgcCode,
                            });
                        }
                    }
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
    }, [region, province, city, barangay, psgcCode, onChange, hydrateExisting]);

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
                const loadedProvinces = await loadPsgcOptions(`regions/${encodeURIComponent(regionCode)}/provinces`);

                if (!cancelled) {
                    setProvinces(loadedProvinces);
                    onProvinceRequirementChange?.(loadedProvinces.length > 0);
                    const savedProvince = hydrateExisting && findPlace(loadedProvinces, province);
                    if (savedProvince) {
                        setProvinceCode(String(savedProvince.code));
                        if (province !== savedProvince.name) {
                            onChange({
                                region,
                                province: savedProvince.name,
                                city,
                                barangay,
                                psgc_code: psgcCode,
                            });
                        }
                    } else {
                        setProvinceCode("");
                        if (hydrateExisting && String(province ?? "").trim()) {
                            onChange({
                                region,
                                province: "",
                                city: "",
                                barangay: "",
                                psgc_code: "",
                            });
                        }
                    }
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
    }, [regionCode, region, province, city, barangay, psgcCode, hydrateExisting, onProvinceRequirementChange, onChange]);

    // =========================
    // LOAD CITIES / MUNICIPALITIES
    // =========================

    useEffect(() => {
        let cancelled = false;

        if (!regionCode || loadingProvinces || (provinces.length > 0 && !provinceCode)) {
            return;
        }

        const loadCities = async () => {
            setLoadingCities(true);
            setAddressError("");

            try {
                const path = provinceCode
                    ? `regions/${encodeURIComponent(regionCode)}/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities`
                    : `regions/${encodeURIComponent(regionCode)}/cities-municipalities`;
                const loadedCities = await loadPsgcOptions(path);

                if (!cancelled) {
                    setCities(loadedCities);
                    const savedCity = hydrateExisting && findPlace(loadedCities, city);
                    if (savedCity) {
                        setCityCode(String(savedCity.code));
                        if (city !== savedCity.name) {
                            onChange({
                                region,
                                province,
                                city: savedCity.name,
                                barangay,
                                psgc_code: psgcCode,
                            });
                        }
                    }
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
    }, [regionCode, provinceCode, region, province, city, barangay, psgcCode, hydrateExisting, loadingProvinces, provinces.length, onChange]);

    // =========================
    // LOAD BARANGAYS
    // =========================

    useEffect(() => {
        let cancelled = false;

        if (
            !regionCode ||
            !cityCode
        ) {
            return;
        }

        const loadBarangays = async () => {
            setLoadingBarangays(true);
            setAddressError("");

            try {
                const path = provinceCode
                    ? `regions/${encodeURIComponent(regionCode)}/provinces/${encodeURIComponent(provinceCode)}/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`
                    : `regions/${encodeURIComponent(regionCode)}/cities-municipalities/${encodeURIComponent(cityCode)}/barangays`;
                const loadedBarangays = await loadPsgcOptions(path);

                if (!cancelled) {
                    setBarangays(loadedBarangays);
                    const nameMatches = loadedBarangays.filter((item) => (
                        [...locationNameVariants(item.name)].some((variant) => locationNameVariants(barangay).has(variant))
                    ));
                    const savedBarangay = psgcCode
                        ? loadedBarangays.find((item) => String(item.code) === String(psgcCode))
                        : nameMatches.length === 1 ? nameMatches[0] : null;
                    if (hydrateExisting && savedBarangay && (barangay !== savedBarangay.name || psgcCode !== savedBarangay.code)) {
                        onChange({
                            region,
                            province,
                            city,
                            barangay: savedBarangay.name,
                            psgc_code: savedBarangay.code,
                        });
                    }
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
    }, [regionCode, provinceCode, cityCode, hydrateExisting, psgcCode, barangay, region, province, city, onChange]);

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
        onProvinceRequirementChange?.(true);
        onPostalCodeChange?.("");

        onChange({
            region: selectedRegion?.name || "",
            province: "",
            city: "",
            barangay: "",
            psgc_code: "",
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
            psgc_code: "",
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
            psgc_code: "",
        });
    };

    // =========================
    // BARANGAY CHANGE
    // =========================

    const handleBarangayChange = (event) => {
        const selectedCode = event.target.value;

        const selectedBarangay = barangays.find((item) => String(item.code) === String(selectedCode));

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
            psgc_code: selectedBarangay?.code || "",
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
                        Province {provinces.length > 0 && <b>*</b>}
                    </label>

                    <select
                        id="province"
                        required={provinces.length > 0}
                        aria-invalid={Boolean(errors.province)}
                        value={provinceCode}
                        onChange={handleProvinceChange}
                        disabled={
                            disabled ||
                            !regionCode ||
                            loadingProvinces ||
                            provinces.length === 0
                        }
                    >
                        <option value="">
                            {!regionCode
                                ? "Select region first"
                                : loadingProvinces
                                    ? "Loading provinces..."
                                    : provinces.length === 0
                                        ? "Not applicable for this region"
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
                            !regionCode ||
                            loadingProvinces ||
                            (provinces.length > 0 && !provinceCode) ||
                            loadingCities
                        }
                    >
                        <option value="">
                            {!regionCode
                                ? "Select region first"
                                : loadingCities
                                    ? "Loading cities..."
                                    : provinces.length > 0 && !provinceCode
                                        ? "Select province first"
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
                                barangays.find((item) => String(item.code) === String(psgcCode))?.code ||
                                barangays.find((item) => item.name === barangay)?.code ||
                                ""
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
