export function formatDeliveryEstimate(estimate) {
    if (!estimate?.from || !estimate?.to) {
        return null;
    }

    const formatDate = (value) => {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!match) return null;

        const [, year, month, day] = match;
        const date = new Date(Number(year), Number(month) - 1, Number(day));
        if (
            date.getFullYear() !== Number(year) ||
            date.getMonth() !== Number(month) - 1 ||
            date.getDate() !== Number(day)
        ) {
            return null;
        }

        return date.toLocaleDateString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    const from = formatDate(estimate.from);
    const to = formatDate(estimate.to);

    return from && to ? `${from} – ${to}` : null;
}

export function getBusinessDayEstimate(minDays, maxDays, startDate = new Date()) {
    if (
        !Number.isInteger(minDays) ||
        !Number.isInteger(maxDays) ||
        minDays < 1 ||
        maxDays < minDays ||
        Number.isNaN(startDate.getTime())
    ) {
        return null;
    }

    const addBusinessDays = (days) => {
        const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        let remaining = days;

        while (remaining > 0) {
            date.setDate(date.getDate() + 1);
            if (date.getDay() !== 0 && date.getDay() !== 6) {
                remaining--;
            }
        }

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    return {
        from: addBusinessDays(minDays),
        to: addBusinessDays(maxDays),
        min_days: minDays,
        max_days: maxDays,
    };
}
