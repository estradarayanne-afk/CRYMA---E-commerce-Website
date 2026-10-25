<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRYMA seller compliance notice</title>
</head>
<body style="margin:0;padding:32px 16px;background:#FFF7F8;font-family:Arial,sans-serif;color:#26151A;line-height:1.6;">
    <main style="max-width:560px;margin:0 auto;padding:28px;background:#fff;border:1px solid #E7E5E2;border-radius:18px;box-shadow:0 12px 34px rgba(75,23,37,.08);">
        <span style="display:inline-block;padding:8px 12px;border-radius:999px;background:#B21F3A;color:#fff;font-size:11px;font-weight:800;letter-spacing:.12em;">CRYMA</span>
        <h1 style="margin:22px 0 10px;color:#4B1725;font-size:24px;">
            {{ $action === 'warning' ? 'Seller compliance warning' : 'Seller account suspended' }}
        </h1>
        <p>Hello {{ $firstName }},</p>
        @if ($action === 'warning')
            <p>Our team has flagged one or more product listings on your CRYMA seller account for compliance review. Please review the issue below and correct any affected listings.</p>
        @else
            <p>Your CRYMA seller account has been suspended following a product compliance review. You cannot access seller services while the suspension is in effect.</p>
        @endif
        <div style="margin:20px 0;padding:16px;border:1px solid #F0DDE2;border-radius:12px;background:#FFF7F8;">
            <strong style="color:#4B1725;">Reason</strong>
            <p style="margin:6px 0 0;white-space:pre-line;">{{ $reason }}</p>
        </div>
        <p>If you believe this action was made in error, contact CRYMA support and include the reason above.</p>
        <p>Thank you,<br><strong style="color:#4B1725;">CRYMA Team</strong></p>
    </main>
</body>
</html>
