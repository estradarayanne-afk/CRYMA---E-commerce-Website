<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CRYMA Account Reactivation Notification</title>
</head>
<body style="margin:0;padding:32px 16px;background:#FFF7F8;font-family:'Segoe UI',Arial,sans-serif;color:#26151A;line-height:1.6;">
    <main style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #E7E5E2;border-radius:20px;box-shadow:0 12px 34px rgba(75,23,37,.08);overflow:hidden;">
        <header style="padding:24px 24px 0;">
            <span style="display:inline-block;padding:10px 14px;background:#B21F3A;color:#fff;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.16em;">CRYMA</span>
        </header>
        <section style="padding:24px 24px 28px;">
            <h1 style="margin:8px 0 14px;color:#4B1725;font-size:26px;line-height:1.25;">Your CRYMA Account Has Been Reactivated</h1>
            <p style="margin:0 0 16px;color:#67515A;">Hello {{ $userName }},</p>
            <p style="margin:0 0 16px;color:#67515A;">Your CRYMA account has been reactivated by our administration team. You can sign in again and access the account features available to your role.</p>
            <p style="margin:0 0 16px;color:#67515A;"><strong style="color:#4B1725;">Date of reactivation:</strong> {{ $reactivatedAt->format('F j, Y \a\t g:i A T') }}</p>
            <p style="margin:0;color:#67515A;">If you have questions, please contact CRYMA support through the support options available to you.</p>
        </section>
        <footer style="padding:0 24px 24px;">
            <div style="padding-top:16px;border-top:1px solid #E7E5E2;color:#8A6871;font-size:12px;line-height:1.6;">
                Sincerely,<br><strong style="color:#4B1725;">CRYMA Administration Team</strong>
            </div>
        </footer>
    </main>
</body>
</html>
