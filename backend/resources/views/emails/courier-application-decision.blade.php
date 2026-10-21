<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Courier application update</title>
</head>
<body>
    <p>Hello {{ $firstName }},</p>

    @if ($approved)
        <p>Your CRYMA courier application has been approved. You can now sign in to access your courier workspace.</p>
    @else
        <p>Your CRYMA courier application was not approved.</p>
        <p>Reason: {{ $rejectionReason }}</p>
        <p>If you have questions, please contact CRYMA support.</p>
    @endif

    <p>Thank you,<br>CRYMA Logistics</p>
</body>
</html>
