/**
 * Firebase Cloud Functions
 *
 * - sendVerificationEmail / resendVerificationCode: 4-digit codes via Resend.
 * - lookupLegoItem: proxies the Rebrickable API server-side, so the API key
 *   stays in Secret Manager and is never shipped to the browser.
 *
 * Secrets (see DEPLOYMENT.md):
 * - RESEND_API_KEY       - Resend API key
 * - REBRICKABLE_API_KEY  - Rebrickable API key (functions/.env, gitignored)
 *
 * Deploy: firebase deploy --only functions
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
 * Look up a LEGO set or minifigure on Rebrickable (server-side).
 *
 * Keeps the Rebrickable API key out of the client. The key is read from
 * `process.env.REBRICKABLE_API_KEY`, set in `functions/.env` (gitignored,
 * never committed). On the Blaze plan you could swap this for Secret Manager
 * + runWith({ secrets }).
 *
 * Called from client with: { itemNumber, itemType, listMinifigs }
 *   - itemType: 'set' | 'minifigure'
 *   - listMinifigs: true  ->  for a SET, return the list of minifigures it
 *     contains (Rebrickable /sets/{num}/minifigs/) instead of set details.
 * Returns mapped item data, { minifigs: [...] }, or null if not found.
 */
exports.lookupLegoItem = functions
    .region('europe-west1')
    .https.onCall(async (data, context) => {
        // Only signed-in users can trigger lookups (prevents anonymous key burn).
        if (!context.auth) {
            throw new functions.https.HttpsError(
                'unauthenticated',
                'You must be signed in to use this feature.'
            );
        }

        const { itemNumber, itemType = 'set', listMinifigs = false } = data || {};

        if (!itemNumber) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                'itemNumber is required'
            );
        }

        const apiKey = process.env.REBRICKABLE_API_KEY;
        if (!apiKey) {
            console.error('REBRICKABLE_API_KEY is not configured');
            throw new functions.https.HttpsError(
                'internal',
                'Lookup service is not configured.'
            );
        }

        const endpoint = itemType === 'minifigure' ? 'minifigs' : 'sets';
        const baseUrl = 'https://rebrickable.com/api/v3/lego';

        const fetchItem = async (num) => {
            const res = await fetch(`${baseUrl}/${endpoint}/${num}/?key=${apiKey}`);
            if (!res.ok) return null;
            return res.json();
        };

        // Fetch the minifigures contained in a set (paginated; collect all pages).
        const fetchSetMinifigs = async (setNum) => {
            const results = [];
            let url = `${baseUrl}/sets/${setNum}/minifigs/?key=${apiKey}&page_size=100`;
            while (url) {
                const res = await fetch(url);
                if (!res.ok) return null;
                const json = await res.json();
                results.push(...(json.results || []));
                url = json.next ? json.next.replace('https://rebrickable.com/api/v3/lego', baseUrl) : null;
            }
            return results.map(function (r) {
                // Listing returns identifiers like "sw0999" or "sw0999-1";
                // our collection stores the base number without variant.
                const raw = r.set_num || r.fig_num || '';
                // Strip variant suffix ("-1", "-2"); keep zero-padded ids like
                // "fig-002544" intact.
                const figNum = raw.replace(/-\d{1,2}$/, '');
                return {
                    figureNumber: figNum,
                    name: r.set_name || r.name || '',
                    quantity: r.quantity || 1,
                    imageUrl: r.set_img_url || r.fig_img_url || null
                };
            });
        };

        try {
            if (listMinifigs && itemType === 'set') {
                let setNum = itemNumber;
                let minifigs = await fetchSetMinifigs(setNum);

                // Bare set numbers return an EMPTY 200 list (not 404);
                // retry with the "-1" variant before concluding "no minifigs".
                if ((!minifigs || minifigs.length === 0) && !setNum.includes('-')) {
                    setNum = `${setNum}-1`;
                    minifigs = await fetchSetMinifigs(setNum);
                }

                if (minifigs === null) return null;
                return { minifigs };
            }

            let json = await fetchItem(itemNumber);

            // Sets are often stored with a "-1" variant suffix; retry if not found.
            if (!json && itemType === 'set' && !itemNumber.includes('-')) {
                json = await fetchItem(`${itemNumber}-1`);
            }

            if (!json) return null;

            return mapRebrickableData(json, itemType);
        } catch (error) {
            console.error('Rebrickable lookup failed:', error);
            return null;
        }
    });

/**
 * Map a Rebrickable API response to the app's item schema.
 */
function mapRebrickableData(data, itemType) {
    if (!data) return null;

    if (itemType === 'set') {
        // Rebrickable set response: { set_num, name, year, theme_id, num_parts, set_img_url }
        const setNum = data.set_num || '';
        const setNumber = setNum.split('-')[0]; // drop variant like "-1"
        return {
            name: data.name || '',
            theme: data.theme_id != null ? data.theme_id.toString() : '',
            year: data.year ? parseInt(data.year) : null,
            imageUrl: data.set_img_url || null,
            setNumber,
            pieceCount: data.num_parts ? parseInt(data.num_parts) : null,
            pricePaid: null
        };
    }

    // Rebrickable minifig response: { fig_num, name, year, theme_id, num_parts, fig_img_url }
    return {
        name: data.name || 'Unknown Minifigure',
        theme: data.theme_id != null ? data.theme_id.toString() : '',
        year: data.year ? parseInt(data.year) : null,
        imageUrl: data.fig_img_url || null,
        figureNumber: data.fig_num || ''
    };
}

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
                                Zarządzaj swoją kolekcją LEGO
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
                                Manage your LEGO collection
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
