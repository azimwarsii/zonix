const { onDocumentCreated } = require('firebase-functions/v2/firestore');
const functions = require('firebase-functions/v1'); // Use v1 for background Auth triggers
const admin = require('firebase-admin');
const crypto = require('crypto');

class IngestionError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = 'IngestionError';
    }
}

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
            if (userDoc.exists && userDoc.data()?.userName) {
                console.log(`User profile already initialized for ${uid}. Skipping.`);
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

            // Create or merge the profile
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
            }, { merge: true });

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
                    planType: 'Premium',
                    paymentHistory: admin.firestore.FieldValue.arrayUnion(newPayment),
                    lastPurchaseAt: admin.firestore.FieldValue.serverTimestamp(),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                console.log(`Successfully updated plan to Premium for user ${app_user_id}`);

                // Send Push Notification if enabled
                if (fcmToken && notificationsEnabled) {
                    const message = {
                        notification: {
                            title: 'Premium Activated! 💎',
                            body: 'Your subscription is active. Enjoy unlimited access to Zonix Pro!',
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
                                        body: 'Your subscription is active. Enjoy unlimited access to Zonix Pro!',
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
                    body: 'Your subscription is active. Enjoy unlimited access to Zonix Pro!',
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
                                body: 'Your subscription is active. Enjoy unlimited access to Zonix Pro!',
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
exports.createCoach = functions.runWith({ secrets: ['OPENAI_API_KEY'] }).https.onCall(async (data, context) => {
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
        knowledge,
        coachId
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
            const isPremium = userData.planType === 'Premium';

            // 3. Handle Credits/Permissions
            if (!isPremium) {
                // If this is a NEW coach creation, deduct 5 credits
                if (!coachId) {
                    if (currentCredits < 5) {
                        throw new functions.https.HttpsError('failed-precondition', 'You need at least 5 coins to forge a new AI Coach. Upgrade to Premium for unlimited forging!');
                    }

                    // Deduct credits
                    transaction.update(userRef, {
                        credits: admin.firestore.FieldValue.increment(-5),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    console.log(`Deducted 5 credits from Non-Premium User ${uid}. Remaining: ${currentCredits - 5}`);
                }
            }

            // 4. Create or Update the Coach Document
            const coachRef = coachId ? admin.firestore().collection('coaches').doc(coachId) : admin.firestore().collection('coaches').doc();
            const coachData = {
                id: coachRef.id,
                name,
                type,
                creatorId: uid,
                portraitUrl: portraitUrl || null,
                specialization,
                isVerified: false,
                yearsOfExpertise: type === 'clone' ? (yearsOfExpertise || 0) : null,
                essence,
                advanced: {
                    primaryGreeting: advanced?.primaryGreeting || "Hello! How can I help you today?",
                    whoAmI: advanced?.whoAmI || "",
                    socialLinks: advanced?.socialLinks || {}
                },
                knowledge: {
                    textRecords: knowledge?.textRecords || "",
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

            console.log(`Successfully created coach ${coachRef.id} for Premium user ${uid}.`);

            return {
                success: true,
                coachId: coachRef.id
            };
        });

        // 5. Ingest knowledge if provided (Triggering the ingestion pipeline)
        if (knowledge?.textRecords && knowledge.textRecords.trim().length > 0) {
            console.log(`Auto-triggering knowledge ingestion for new coach: ${result.coachId}`);
            try {
                // We call the logic directly here
                await performKnowledgeIngestion(result.coachId, knowledge.textRecords, "Initial Forge");
            } catch (ingestError) {
                console.error(`Warning: Auto-ingestion failed for coach ${result.coachId}:`, ingestError);
            }
        }

        return result;
    } catch (error) {
        console.error('Error creating coach:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An error occurred while creating your coach. Please try again.');
    }
});

/**
 * Shared helper to perform the knowledge ingestion pipeline.
 */

async function performKnowledgeIngestion(coachId, text, docLabel) {
    console.log("--------------------------------------------------");
    console.log(`[Ingest] Coach: ${coachId}`);
    console.log(`[Ingest] Label: ${docLabel}`);

    // STEP 1 — Cleaning + normalization
    const cleanedText = text
        .normalize("NFKC")
        .replace(/[^\S\r\n]+/g, ' ')
        .replace(/\r/g, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (cleanedText.length < 20) {
        throw new IngestionError("Text too small after cleaning.", "TEXT_TOO_SMALL");
    }

    console.log(`[Ingest] Cleaned length: ${cleanedText.length}`);

    // Content hash for duplicate detection
    const contentHash = crypto
        .createHash('sha256')
        .update(cleanedText)
        .digest('hex');

    console.log(`[Ingest] Content hash: ${contentHash}`);

    // Check for duplicates
    const db = admin.firestore();
    const coachDoc = await db.collection('coaches').doc(coachId).get();

    if (!coachDoc.exists) {
        throw new IngestionError("Coach not found.", "COACH_NOT_FOUND");
    }

    if (coachDoc.data().knowledge?.lastHash === contentHash) {
        console.log("[Ingest] Duplicate content detected. Skipping.");
        return { chunkCount: 0, skipped: true, reason: "duplicate" };
    }

    // STEP 2 — Chunking with oversized paragraph protection
    const splitParagraph = (p) => {
        const words = p.split(/\s+/);
        const chunks = [];

        for (let i = 0; i < words.length; i += 300) {
            chunks.push(words.slice(i, i + 300).join(' '));
        }

        return chunks;
    };

    const rawParagraphs = cleanedText
        .split(/\n+/)
        .map(p => p.trim())
        .filter(Boolean);

    const paragraphs = rawParagraphs
        .flatMap(p => p.split(/\s+/).length > 800 ? splitParagraph(p) : [p])
        .filter(p => p.trim().length > 10); // Filter tiny chunks

    const chunks = [];
    let current = [];
    let wordCount = 0;

    for (const p of paragraphs) {
        const words = p.split(/\s+/).length;

        if (wordCount + words > 550 && current.length) {
            chunks.push(current.join('\n\n'));
            current = [p];
            wordCount = words;
        } else {
            current.push(p);
            wordCount += words;

            if (wordCount >= 400) {
                chunks.push(current.join('\n\n'));
                current = [];
                wordCount = 0;
            }
        }
    }

    if (current.length) chunks.push(current.join('\n\n'));

    if (!chunks.length) {
        throw new IngestionError("No valid chunks generated.", "NO_CHUNKS");
    }

    if (chunks.length > 499) { // Firestore batch limit minus coach update
        throw new IngestionError(
            `Too many chunks (${chunks.length}). Maximum 499 allowed.`,
            "TOO_MANY_CHUNKS"
        );
    }

    console.log(`[Ingest] Chunk count: ${chunks.length}`);

    // STEP 3 — Embedding with exponential backoff retry
    const { OpenAI } = require('openai');
    const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
    });

    async function embedWithRetry(inputs, retries = 2, delay = 1000) {
        try {
            return await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: inputs
            });
        } catch (err) {
            if (!retries) {
                console.error("[Embed] All retries exhausted:", err.message);
                throw err;
            }
            console.warn(`[Embed] Retry ${3 - retries}/2 after ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
            return embedWithRetry(inputs, retries - 1, delay * 2);
        }
    }

    console.log("[Ingest] Requesting embeddings...");
    const embeddingResponse = await embedWithRetry(chunks);

    const embeddings = embeddingResponse.data.map(d => d.embedding);

    if (embeddings.length !== chunks.length) {
        throw new IngestionError(
            `Embedding count mismatch: expected ${chunks.length}, got ${embeddings.length}`,
            "EMBEDDING_MISMATCH"
        );
    }

    console.log("[Ingest] Embeddings received.");

    // STEP 4 — Firestore storage with error handling
    const batch = db.batch();
    const ref = db.collection('coaches').doc(coachId).collection('knowledgeChunks');

    chunks.forEach((chunk, i) => {
        const doc = ref.doc();
        batch.set(doc, {
            text: chunk,
            embedding: embeddings[i],
            docLabel: docLabel || "Manual Upload",
            index: i,
            contentHash,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    });

    batch.update(db.collection('coaches').doc(coachId), {
        'knowledge.lastSyncAt': admin.firestore.FieldValue.serverTimestamp(),
        'knowledge.lastHash': contentHash,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log("[Ingest] Writing to Firestore...");

    try {
        await batch.commit();
        console.log("[Ingest] Complete.");
        return { chunkCount: chunks.length, contentHash };
    } catch (err) {
        console.error("[Ingest] Firestore commit failed:", err);
        console.error(`[Ingest] Lost ${chunks.length} embedded chunks for coach ${coachId}`);
        throw new IngestionError("Failed to save to database.", "DB_COMMIT_FAILED");
    }
}

exports.ingestCoachKnowledge = functions.runWith({ secrets: ['OPENAI_API_KEY'] }).https.onCall(async (data, context) => {
    // Ensuring authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { text, coachId, docLabel } = data;

    // STEP 1 — Validation
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Text cannot be empty.');
    }
    if (text.length > 50000) {
        throw new functions.https.HttpsError('invalid-argument', 'Text exceeds 50,000 character limit.');
    }
    if (!coachId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing coachId.');
    }

    console.log(`Manual ingestion request for coach: ${coachId} by user: ${context.auth.uid}`);

    try {
        const db = admin.firestore();
        // Ownership Validation
        const coachDoc = await db.collection('coaches').doc(coachId).get();
        if (!coachDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Coach not found.');
        }
        if (coachDoc.data().creatorId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'You do not own this coach.');
        }

        const result = await performKnowledgeIngestion(coachId, text, docLabel);
        return {
            ...result,
            success: true
        };
    } catch (error) {
        console.error('--------------------------------------------------');
        console.error('[ERROR] ingestCoachKnowledge Pipeline Failed:');
        console.error(`Status: ${error.status || 'Internal'}`);
        console.error(`Message: ${error.message}`);
        console.error('Stack:', error.stack);
        console.error('--------------------------------------------------');

        if (error.status === 401) {
            throw new functions.https.HttpsError('unauthenticated', 'Invalid OpenAI API key.');
        }
        throw new functions.https.HttpsError('internal', 'Embedding/Storage failed: ' + error.message);
    }
});


/**
 * RAG + LLM Chat Trigger
 * Listens for new user messages and generates an AI response.
 */
exports.onNewMessage = functions.runWith({
    secrets: ['OPENAI_API_KEY'],
    timeoutSeconds: 60,
    memory: '1GB'
}).firestore.document('conversations/{conversationId}/messages/{messageId}').onCreate(async (snapshot, context) => {
    const message = snapshot.data();
    const { conversationId } = context.params;

    // 1. Only respond to User messages
    if (message.role !== 'user' || message.isSystem) {
        return null;
    }

    console.log(`[Chat] New message from user in conversation: ${conversationId}`);

    const db = admin.firestore();
    const convRef = db.collection('conversations').doc(conversationId);

    // 2. Fetch Conversation & Coach Context
    const conversationDoc = await convRef.get();
    if (!conversationDoc.exists) {
        console.error(`Conversation ${conversationId} not found.`);
        return null;
    }
    const conversationData = conversationDoc.data();
    const coachId = conversationData.coachId;
    const userId = conversationData.userId;
    // 3. Fetch User Data to check Credits
    const userRef = db.collection('users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        console.error(`User ${userId} not found. Skipping.`);
        return null;
    }
    const userData = userDoc.data();

    // 4. Credit Logic for non-Premium users
    const isPremium = userData.planType === 'Premium';
    if (!isPremium) {
        const currentCredits = userData.credits || 0;
        if (currentCredits < 1) {
            console.log(`User ${userId} is out of credits. Sending notification message.`);

            // Add a system-style response to inform them they are out of credits
            await convRef.collection('messages').add({
                role: 'assistant',
                content: "You are out of coins. 🪙 Upgrade to Premium for UNLIMITED messaging or earn more coins to continue chatting.",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                userId: userId,
                isSystem: true // UI can handle this differently if needed
            });

            // Update conversation to show this as last activity
            await convRef.update({
                lastMessageAt: admin.firestore.FieldValue.serverTimestamp()
            });

            return null;
        }

        // Deduct 1 credit
        await userRef.update({
            credits: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Deducted 1 credit from User ${userId}. Remaining: ${currentCredits - 1}`);
    }

    // 5. Fetch Coach Data
    const coachDoc = await db.collection('coaches').doc(coachId).get();
    if (!coachDoc.exists) {
        console.error(`Coach ${coachId} not found.`);
        return null;
    }
    const coachData = coachDoc.data();

    // 6. Initialize OpenAI
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
        // 4. RAG Implementation (Naive Cosine Similarity)
        let contextText = "";
        let sources = [];

        // Check if coach has knowledge
        const chunksRef = db.collection('coaches').doc(coachId).collection('knowledgeChunks');
        // Limit query to avoid memory explosion (e.g., scan latest 200 chunks or all if manageable)
        // ideally we use a vector db. For now, we fetch all (assuming < 500 chunks limit in ingestion).
        const chunksSnapshot = await chunksRef.get();

        if (!chunksSnapshot.empty) {
            console.log(`[Chat] Performing RAG search across ${chunksSnapshot.size} chunks...`);

            // Embed user query
            const queryEmbeddingRes = await openai.embeddings.create({
                model: "text-embedding-3-small",
                input: message.content
            });
            const queryVector = queryEmbeddingRes.data[0].embedding;

            // Compute Similarities
            const scoredChunks = chunksSnapshot.docs.map(doc => {
                const data = doc.data();
                const similarity = cosineSimilarity(queryVector, data.embedding);
                return { ...data, id: doc.id, similarity };
            });

            // Top K (e.g., Top 3)
            scoredChunks.sort((a, b) => b.similarity - a.similarity);
            const topChunks = scoredChunks.slice(0, 3).filter(c => c.similarity > 0.3); // Threshold

            if (topChunks.length > 0) {
                contextText = topChunks.map(c => c.text).join("\n\n---\n\n");
                sources = topChunks.map(c => ({ id: c.id, similarity: c.similarity, docLabel: c.docLabel }));
                console.log(`[Chat] Found ${topChunks.length} relevant chunks.`);
            }
        }

        // 5. Construct System Prompt
        const systemPrompt = `
You are ${coachData.name}, a ${coachData.type} AI Coach specialized in ${coachData.specialization}.
Your core essence is: ${JSON.stringify(coachData.essence || {})}
Who Am I: ${coachData.advanced?.whoAmI || "Not specified."}
Greeting Style: ${coachData.advanced?.primaryGreeting || "standard."}

Instructions:
- Be helpful, empathetic, and stay in character.
- Keep responses concise (under 200 words) unless asked for details.
- Use the provided context (Knowledge Base) to answer questions if relevant.
- If the context doesn't have the answer, use your general knowledge but mention you are answering generally.

Knowledge Base Context:
${contextText || "No context found."}
`;

        // 6. Generate Response
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective
            messages: [
                { role: "system", content: systemPrompt },
                // Ideally include chat history here (fetch last N messages)
                { role: "user", content: message.content }
            ],
            max_tokens: 500
        });

        const reply = completion.choices[0].message.content;
        const usage = completion.usage;

        // 7. Save Assistant Response
        await convRef.collection('messages').add({
            role: 'assistant',
            content: reply,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            ragSources: sources,
            tokenUsage: usage,
            userId: userId
        });

        // 8. Update Conversation Stats
        await convRef.update({
            lastMessageAt: admin.firestore.FieldValue.serverTimestamp(),
            tokenUsageTotal: admin.firestore.FieldValue.increment(usage.total_tokens)
        });

        // 9. Update Coach Stats (Chats)
        await db.collection('coaches').doc(coachId).update({
            'stats.chats': admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[Chat] Response sent. Tokens: ${usage.total_tokens}`);

    } catch (error) {
        console.error('[Chat] Error generating response:', error);
        // Fallback or error handling
    }
});

// Helper: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

/**
 * Callable function to toggle like status for a coach.
 * Handles updating the like count and the likedBy array atomically.
 */
exports.toggleLike = functions.https.onCall(async (data, context) => {
    // 1. Ensure user is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to like coaches.');
    }

    const uid = context.auth.uid;
    const { coachId } = data;

    if (!coachId) {
        throw new functions.https.HttpsError('invalid-argument', 'Missing coachId.');
    }

    const coachRef = admin.firestore().collection('coaches').doc(coachId);

    try {
        const result = await admin.firestore().runTransaction(async (transaction) => {
            const coachDoc = await transaction.get(coachRef);

            if (!coachDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Coach not found.');
            }

            const coachData = coachDoc.data();
            const likedBy = coachData.likedBy || [];
            const isLiked = likedBy.includes(uid);

            let newLikesCount = (coachData.stats?.likes || 0);

            if (isLiked) {
                // Unlike
                newLikesCount = Math.max(0, newLikesCount - 1);
                transaction.update(coachRef, {
                    likes: admin.firestore.FieldValue.increment(-1),
                    'stats.likes': admin.firestore.FieldValue.increment(-1),
                    likedBy: admin.firestore.FieldValue.arrayRemove(uid),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Like
                newLikesCount += 1;
                transaction.update(coachRef, {
                    likes: admin.firestore.FieldValue.increment(1),
                    'stats.likes': admin.firestore.FieldValue.increment(1),
                    likedBy: admin.firestore.FieldValue.arrayUnion(uid),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }

            return {
                success: true,
                isLiked: !isLiked,
                likes: newLikesCount
            };
        });

        return result;
    } catch (error) {
        console.error('Error toggling like:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'An error occurred while liking the coach.');
    }
});
