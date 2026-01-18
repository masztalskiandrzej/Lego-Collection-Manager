/**
 * Firebase Cloud Functions - Email Verification Service
 *
 * Uses Resend API to send verification codes
 *
 * Setup:
 * 1. Get Resend API key from https://resend.com/api-keys
 * 2. Add to functions/.env: RESEND_API_KEY=re_xxxxxxxxx
 * 3. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Resend } = require('resend');

// Initialize Firebase Admin
admin.initializeApp();

// Get Resend API key from environment variables
const getResendClient = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        throw new Error('Resend API key not configured. Add RESEND_API_KEY to functions/.env file');
    }
    return new Resend(apiKey);
};

/**
 * Send verification email with 4-digit code
 *
 * Called from client with: { email, code, language }
 */
exports.sendVerificationEmail = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        const { email, code, language = 'pl' } = data;

        // Validate input
        if (!email || !code) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Email and code are required'
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Invalid email format'
            );
        }

        // Validate code format (4 digits)
        if (!/^\d{4}$/.test(code)) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Code must be 4 digits'
            );
        }

        try {
            const resend = getResendClient();

            // Email content based on language
            const content = getEmailContent(code, language);

            const response = await resend.emails.send({
                from: 'Collection Manager <onboarding@resend.dev>',
                to: email,
                subject: content.subject,
                html: content.html
            });

            console.log(`✅ Verification email sent to ${email}`, response);

            return {
                success: true,
                messageId: response.data?.id
            };

        } catch (error) {
            console.error('❌ Failed to send email:', error);

            // Handle Resend-specific errors
            if (error.statusCode === 403) {
                throw new functions.https.HttpsError(
                    'permission-denied',
                    'Email sending not configured. Please verify your domain in Resend.'
                );
            }

            throw new functions.https.HttpsError(
                'internal',
                'Failed to send verification email. Please try again.'
            );
        }
    });

/**
 * Resend verification code (generates new code and sends email)
 */
exports.resendVerificationCode = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        const { email, userId, language = 'pl' } = data;

        if (!email || !userId) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'Email and userId are required'
            );
        }

        try {
            // Generate new 4-digit code
            const newCode = Math.floor(1000 + Math.random() * 9000).toString();

            // Update code in Firestore
            const db = admin.firestore();
            await db.collection('users').doc(userId)
                .collection('profile').doc('userData')
                .update({
                    verificationCode: newCode,
                    codeResentAt: admin.firestore.FieldValue.serverTimestamp()
                });

            // Send email with new code
            const resend = getResendClient();
            const content = getEmailContent(newCode, language);

            const response = await resend.emails.send({
                from: 'Collection Manager <onboarding@resend.dev>',
                to: email,
                subject: content.subject,
                html: content.html
            });

            console.log(`✅ New verification code sent to ${email}`, response);

            return {
                success: true,
                messageId: response.data?.id
            };

        } catch (error) {
            console.error('❌ Failed to resend code:', error);
            throw new functions.https.HttpsError(
                'internal',
                'Failed to resend verification code. Please try again.'
            );
        }
    });

/**
 * Get email content based on language
 */
function getEmailContent(code, language) {
    const templates = {
        pl: {
            subject: `Twój kod weryfikacyjny: ${code}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; max-width: 500px;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #E3000B 0%, #FFD500 50%, #006DB7 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                Collection Manager
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px; text-align: center;">
                                Weryfikacja adresu email
                            </h2>

                            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
                                Wpisz poniższy kod, aby potwierdzić swój adres email:
                            </p>

                            <!-- Code Box -->
                            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 0 0 30px 0; border: 2px dashed #dee2e6;">
                                <span style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #E3000B; font-family: 'Courier New', monospace;">
                                    ${code}
                                </span>
                            </div>

                            <p style="color: #999; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
                                Kod jest ważny przez 15 minut.<br>
                                Jeśli nie rejestrowałeś się w Collection Manager, zignoruj tę wiadomość.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                &copy; 2024 Collection Manager<br>
                                Zarządzaj swoją kolekcją LEGO, książek i gier
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        },
        en: {
            subject: `Your verification code: ${code}`,
            html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" max-width="500" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; max-width: 500px;">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #E3000B 0%, #FFD500 50%, #006DB7 100%); padding: 30px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 28px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                                Collection Manager
                            </h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="color: #333; margin: 0 0 20px 0; font-size: 22px; text-align: center;">
                                Email Verification
                            </h2>

                            <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
                                Enter the code below to verify your email address:
                            </p>

                            <!-- Code Box -->
                            <div style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); border-radius: 12px; padding: 25px; text-align: center; margin: 0 0 30px 0; border: 2px dashed #dee2e6;">
                                <span style="font-size: 42px; font-weight: bold; letter-spacing: 12px; color: #E3000B; font-family: 'Courier New', monospace;">
                                    ${code}
                                </span>
                            </div>

                            <p style="color: #999; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
                                This code is valid for 15 minutes.<br>
                                If you didn't register for Collection Manager, please ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                &copy; 2024 Collection Manager<br>
                                Manage your LEGO, Books, and Games collection
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
            `
        }
    };

    return templates[language] || templates.en;
}
