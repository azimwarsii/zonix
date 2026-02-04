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
                redeemedCodes: [], // Track redeemed codes

                // New Fields
                persona: "",
                notifications: true,
                active_messaging: true,
                calls: true,

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
exports.handleRevenueCatEvent = functions.firestore.document('revenuecat_events/{eventId}').onCreate(async (snapshot, context) => {
    const eventData = snapshot.data();
    if (!eventData) {
        console.log('No data associated with the event');
        return null;
    }

    const { type, app_user_id, product_id } = eventData;
    const eventId = context.params.eventId;

    console.log(`[V1 TRIGGER] Processing RevenueCat event: ${type} for user: ${app_user_id} (ID: ${eventId})`);

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

                const userData = userDoc.data();
                const fcmToken = userData.fcmToken;
                const notificationsEnabled = userData.notifications !== false;

                const newPayment = {
                    id: eventId,
                    amount: eventData.price_in_purchased_currency || '$19.99',
                    date: admin.firestore.FieldValue.serverTimestamp(),
                    status: 'Completed',
                    description: `Premium Subscription (${type})`,
                    productId: product_id,
                    revenueCatEventId: eventId
                };

                transaction.update(userRef, {
                    credits: admin.firestore.FieldValue.increment(1000),
                    planType: 'Premium',
                    paymentHistory: admin.firestore.FieldValue.arrayUnion(newPayment),
                    lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`Successfully granted 1000 credits to user ${app_user_id}`);

                // Send Push Notification if enabled
                if (fcmToken && notificationsEnabled) {
                    const message = {
                        notification: {
                            title: 'Premium Activated! 💎',
                            body: 'Your subscription is active and 1,000 credits have been added to your account. Enjoy Zonix Pro!',
                        },
                        token: fcmToken,
                        android: {
                            notification: {
                                color: '#aa48b7',
                            },
                        },
                        apns: {
                            payload: {
                                aps: {
                                    alert: {
                                        title: 'Premium Activated! 💎',
                                        body: 'Your subscription is active and 1,000 credits have been added to your account. Enjoy Zonix Pro!',
                                    },
                                    badge: 1,
                                    sound: 'default'
                                },
                            },
                        },
                    };

                    try {
                        const response = await admin.messaging().send(message);
                        console.log(`Notification sent successfully to ${app_user_id}. MessageID: ${response}`);
                    } catch (notifError) {
                        console.error('Error sending push notification:', notifError);
                    }
                }
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

/**
 * Triggered when a user balance is deleted from Firebase Auth.
 * Cleans up the user document but KEEPS the email record 
 * to prevent credit farming (deleting and recreating for free coins).
 */
exports.onUserDelete = functions.auth.user().onDelete(async (user) => {
    const uid = user.uid;

    console.log(`Cleaning up data for deleted user: ${uid}`);

    const userRef = admin.firestore().collection('users').doc(uid);

    try {
        await userRef.delete();
        console.log(`Successfully cleaned up data for user: ${uid}`);
    } catch (error) {
        console.error('Error in onUserDelete cleanup:', error);
    }
});

/**
 * Fail-safe trigger: Listens to the 'users' collection directly.
 * Whenever a user's planType changes to 'Premium', send a notification.
 * This works even if the RevenueCat event trigger fails.
 */
exports.onUserPlanUpgrade = functions.firestore.document('users/{userId}').onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const uid = context.params.userId;

    console.log(`[USER TRIGGER] Checking update for user: ${uid}`);

    // Check if the planType changed from anything to 'Premium'
    if (before.planType !== 'Premium' && after.planType === 'Premium') {
        const fcmToken = after.fcmToken;
        const notificationsEnabled = after.notifications !== false;

        console.log(`[USER TRIGGER] Plan upgrade detected for ${uid}. Token: ${fcmToken ? 'Present' : 'Missing'}, Enabled: ${notificationsEnabled}`);

        if (fcmToken && notificationsEnabled) {
            const message = {
                token: fcmToken,
                notification: {
                    title: 'Premium Activated! 💎',
                    body: 'Your subscription is active and 1,000 credits have been added. Enjoy!',
                },
                android: {
                    priority: 'high',
                    notification: {
                        color: '#aa48b7',
                        sound: 'default',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            alert: {
                                title: 'Premium Activated! 💎',
                                body: 'Your subscription is active and 1,000 credits have been added. Enjoy!',
                            },
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
            };

            try {
                const response = await admin.messaging().send(message);
                console.log(`[USER TRIGGER] Successfully sent to ${uid}. Message ID: ${response}`);
            } catch (error) {
                console.error(`[USER TRIGGER] Failed to send notification to ${uid}:`, error.message);
                if (error.code === 'messaging/third-party-auth-error') {
                    console.error('[USER TRIGGER] IMPORTANT: Please check your APNs (.p8) key in Firebase Console -> Project Settings -> Cloud Messaging.');
                }
            }
        }
    }
    return null;
});

/**
 * Callable function to create a new AI Coach.
 * Deducts 5 credits from the user and initializes the coach document.
 */
exports.createCoach = functions.https.onCall(async (data, context) => {
    // 1. Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to create coaches.');
    }

    const uid = context.auth.uid;
    const {
        name,
        type,
        portraitUrl,
        specialization,
        yearsOfExpertise,
        essence,
        advanced,
        knowledge
    } = data;

    // 2. Validate basic required data
    if (!name || !type || !specialization || !essence) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing required coach details.');
    }

    console.log(`User ${uid} attempting to create a coach: ${name} (${type})`);

    try {
        const result = await admin.firestore().runTransaction(async (transaction) => {
            const userRef = admin.firestore().collection('users').doc(uid);
            const userDoc = await transaction.get(userRef);

            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User profile not found.');
            }

            const userData = userDoc.data();
            const currentCredits = userData.credits || 0;

            // 3. Check for sufficient credits
            if (currentCredits < 5) {
                throw new functions.https.HttpsError('failed-precondition', 'Insufficient credits. Creating a coach costs 5 credits.');
            }

            // 4. Create the Coach Document
            const coachRef = admin.firestore().collection('coaches').doc();
            const coachData = {
                id: coachRef.id,
                name,
                type,
                creatorId: uid,
                portraitUrl: portraitUrl || null,
                specialization,
                yearsOfExpertise: type === 'clone' ? (yearsOfExpertise || 0) : null,
                essence,
                advanced: {
                    primaryGreeting: advanced?.primaryGreeting || "Hello! How can I help you today?",
                    whoAmI: type === 'imaginative' ? (advanced?.whoAmI || "") : null
                },
                knowledge: {
                    textRecords: knowledge?.textRecords || "",
                    googleAuth: {
                        access_token: knowledge?.googleAuth?.access_token || null,
                        refresh_token: knowledge?.googleAuth?.refresh_token || null
                    },
                    lastSyncAt: null
                },
                stats: {
                    likes: 0,
                    follows: 0,
                    chats: 0
                },
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            transaction.set(coachRef, coachData);

            // 5. Deduct Credits
            transaction.update(userRef, {
                credits: admin.firestore.FieldValue.increment(-5),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            console.log(`Successfully created coach ${coachRef.id} and deducted 5 credits from user ${uid}.`);

            return {
                success: true,
                coachId: coachRef.id,
                remainingCredits: currentCredits - 5
            };
        });

        return result;
    } catch (error) {
        console.error('Error creating coach:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An error occurred while creating your coach. Please try again.');
    }
});
