<!doctype html>
<html lang="en">
<body style="margin:0;padding:32px;background:#f8f2f4;font-family:Arial,sans-serif;color:#321820">
    <main style="max-width:560px;margin:auto;padding:28px;border:1px solid #eadde1;border-radius:16px;background:#fff">
        <p style="margin:0 0 8px;color:#8a1c30;font-size:12px;font-weight:bold;letter-spacing:2px">CRYMA REGISTRATION REVIEW</p>
        <h1 style="margin:0 0 16px;font-size:23px">Please replace a document</h1>
        <p>Hello {{ $firstName }},</p>
        <p>We couldn’t accept the <strong>{{ $documentName }}</strong> you submitted. Please review the reason and upload a replacement so we can continue reviewing your application.</p>
        <div style="margin:20px 0;padding:14px 16px;border-left:3px solid #b21f3a;border-radius:8px;background:#fff7f8">
            <strong>Reviewer’s note</strong>
            <p style="margin:8px 0 0;line-height:1.5">{{ $reason }}</p>
        </div>
        <p style="margin:24px 0"><a href="{{ $correctionUrl }}" style="display:inline-block;padding:12px 18px;border-radius:9px;background:#7e1830;color:#fff;text-decoration:none;font-weight:bold">Upload replacement</a></p>
        <p style="color:#806a71;font-size:13px;line-height:1.5">This private link expires in 7 days and can be used once. Your application remains pending while the replacement is reviewed.</p>
    </main>
</body>
</html>
