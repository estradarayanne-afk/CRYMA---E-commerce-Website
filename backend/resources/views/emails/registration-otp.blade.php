
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 32px 16px; background: #FFF7F8; font-family: 'Segoe UI', Arial, sans-serif; color: #26151A; line-height: 1.6;">
    <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 1px solid #E7E5E2; border-radius: 20px; box-shadow: 0 12px 34px rgba(75, 23, 37, 0.08); overflow: hidden;">
        <div style="padding: 24px 24px 0;">
            <div style="display: inline-block; padding: 10px 14px; background: #B21F3A; color: #FFFFFF; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;">
                {{ $appName }}
            </div>
        </div>

        <div style="padding: 24px 24px 28px;">
            <div style="display: inline-block; padding: 7px 12px; background: #F9DCE4; color: #7E1830; border-radius: 999px; font-size: 10px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;">
                Email verification
            </div>

            <h1 style="margin: 18px 0 10px; color: #4B1725; font-size: 30px; line-height: 1.2; letter-spacing: -0.03em; font-weight: 700;">
                Verify your email address
            </h1>

            <p style="margin: 0 0 18px; color: #8A6871; font-size: 14px; line-height: 1.7;">
                Thank you for registering with {{ $appName }}. Enter the verification code below to confirm your email and continue creating your account.
            </p>

            <div style="padding: 20px 16px; background: #FFF7F8; border: 1px solid #F0DDE2; border-radius: 16px; text-align: center;">
                <div style="margin-bottom: 8px; color: #8A6871; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;">
                    Verification code
                </div>
                <div style="font-size: 34px; font-weight: 800; letter-spacing: 10px; color: #4B1725; line-height: 1.2;">
                    {{ $otp }}
                </div>
            </div>

            <p style="margin: 18px 0 8px; color: #8A6871; font-size: 14px; line-height: 1.7;">
                This code expires in <strong style="color: #4B1725;">10 minutes</strong>.
            </p>

            <p style="margin: 0; color: #8A6871; font-size: 14px; line-height: 1.7;">
                If you did not request this code, you can safely ignore this email.
            </p>
        </div>

        <div style="padding: 0 24px 24px;">
            <div style="padding-top: 16px; border-top: 1px solid #E7E5E2; color: #8A6871; font-size: 12px; line-height: 1.6;">
                Thank you,<br>
                <strong style="color: #4B1725;">{{ $appName }} Team</strong>
            </div>
        </div>
    </div>
</body>
</html>
