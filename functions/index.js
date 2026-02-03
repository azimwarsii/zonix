const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const functions = require('firebase-functions/v1'); // Use v1 for background Auth triggers
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Triggered when a new user is created in Firebase Auth.
 * Automatically initializes the user profile in Firestore and prevents credit farming.
 */
exports.onUserCreate = functions.auth.user().onCreate(async (user) => {
    const uid = user.uid;
    const email = user.email || '';

    console.log(`Initializing profile for new user: ${uid} (${email})`);

    const userRef = admin.firestore().collection('users').doc(uid);
    // Document ID is the email address to ensure fast lookups
    const emailRef = admin.firestore().collection('processed_emails').doc(email || 'anonymous_' + uid);

    try {
        await admin.firestore().runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            if (userDoc.exists) {
                console.log(`User profile already exists for ${uid}. Skipping.`);
                return;
            }

            // Check if this email has already claimed the 50 free credits
            let creditsToGrant = 50;
            if (email) {
                const emailDoc = await transaction.get(emailRef);
                if (emailDoc.exists) {
                    console.log(`Email ${email} has already claimed free credits. Granting 0.`);
                    creditsToGrant = 0;
                } else {
                    // Mark email as used so they can't delete and recreate for more credits
                    transaction.set(emailRef, {
                        uid: uid,
                        claimedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            // Generate a unique username
            let userName = `user_${Math.floor(100000 + Math.random() * 900000)}`;

            // Create the profile
            transaction.set(userRef, {
                userName: userName,
                email: email,
                planType: 'Free',
                credits: creditsToGrant,
                photoURL: user.photoURL || null,
                paymentHistory: [], // Initialize as an empty array
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`Successfully created profile for ${uid} with ${creditsToGrant} credits.`);
        });
    } catch (error) {
        console.error('Error in onUserCreate transaction:', error);
    }
});

/**
 * Triggered when RevenueCat's Firebase Extension writes a new event to Firestore.
 * This handles granting credits and updating plan status on the backend.
 */
exports.handleRevenueCatEvent = onDocumentCreated('revenuecat_events/{eventId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data associated with the event');
        return null;
    }

    const eventData = snapshot.data();
    const { type, app_user_id, product_id } = eventData;

    console.log(`Processing RevenueCat event: ${type} for user: ${app_user_id}`);

    // Define which events should grant credits
    const creditGrantingEvents = ['INITIAL_PURCHASE', 'RENEWAL'];

    if (creditGrantingEvents.includes(type)) {
        const userRef = admin.firestore().collection('users').doc(app_user_id);

        try {
            return await admin.firestore().runTransaction(async (transaction) => {
                const userDoc = await transaction.get(userRef);

                if (!userDoc.exists) {
                    console.error(`User ${app_user_id} does not exist in Firestore.`);
                    return;
                }

                const newPayment = {
                    id: event.params.eventId,
                    amount: eventData.price_in_purchased_currency || '$19.99',
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'Completed',
                    description: `Premium Subscription (${type})`,
                    productId: product_id,
                    revenueCatEventId: event.params.eventId
                };

                transaction.update(userRef, {
                    credits: admin.firestore.FieldValue.increment(1000),
                    planType: 'Premium',
                    paymentHistory: admin.firestore.FieldValue.arrayUnion(newPayment),
                    lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`Successfully granted 1000 credits to user ${app_user_id}`);
            });
        } catch (error) {
            console.error('Error updating user credits via transaction:', error);
        }
    }

    return null;
});

/**
 * Callable function to redeem a promo code.
 * Validates the code exists, hasn't been used by this user, and adds coins to their account.
 */
exports.redeemCode = functions.https.onCall(async (data, context) => {
    // Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to redeem codes.');
    }

    const uid = context.auth.uid;
    const { code } = data;

    // Validate input
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Please enter a valid code.');
    }

    const codeToRedeem = code.trim().toUpperCase();

    console.log(`User ${uid} attempting to redeem code: ${codeToRedeem}`);

    try {
        // Use a transaction to ensure atomicity
        const result = await admin.firestore().runTransaction(async (transaction) => {
            // Query for the code document
            const codeQuery = await admin.firestore()
                .collection('code')
                .where('code', '==', codeToRedeem)
                .limit(1)
                .get();

            // Check if code exists
            if (codeQuery.empty) {
                throw new functions.https.HttpsError('not-found', 'Invalid code. Please check and try again.');
            }

            const codeDoc = codeQuery.docs[0];
            const codeData = codeDoc.data();
            const coinsToAdd = codeData.coin || 0;

            if (coinsToAdd <= 0) {
                throw new functions.https.HttpsError('invalid-argument', 'This code has no coins associated with it.');
            }

            // Check if user has already redeemed this code
            const userRef = admin.firestore().collection('users').doc(uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User profile not found.');
            }

            const userData = userDoc.data();
            const redeemedCodes = userData.redeemedCodes || [];

            if (redeemedCodes.includes(codeToRedeem)) {
                throw new functions.https.HttpsError('already-exists', 'You have already redeemed this code.');
            }

            // Add coins to user and mark code as redeemed
            transaction.update(userRef, {
                credits: admin.firestore.FieldValue.increment(coinsToAdd),
                redeemedCodes: admin.firestore.FieldValue.arrayUnion(codeToRedeem),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Delete the code document so it can't be used again
            transaction.delete(codeDoc.ref);

            console.log(`Successfully redeemed code ${codeToRedeem} for user ${uid}. Added ${coinsToAdd} coins. Code deleted.`);

            return {
                success: true,
                coinsAdded: coinsToAdd,
                message: `Success! ${coinsToAdd} coins added to your account.`
            };
        });

        return result;
    } catch (error) {
        console.error('Error redeeming code:', error);

        // If it's already an HttpsError, rethrow it
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }

        // Otherwise, wrap it in a generic error
        throw new functions.https.HttpsError('internal', 'Failed to redeem code. Please try again later.');
    }
});
