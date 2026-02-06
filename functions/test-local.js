/**
 * Local Test Script for Knowledge Ingestion
 * 
 * Usage: 
 * 1. Set your OPENAI_API_KEY in your terminal: $env:OPENAI_API_KEY="your-key"
 * 2. Run: node test-local.js
 */

const admin = require('firebase-admin');
const { OpenAI } = require('openai');

// Initialize Admin for local use (Ensure you have GOOGLE_APPLICATION_CREDENTIALS set if hitting real Firestore)
// Or just mock the parts you need.
if (!admin.apps.length) {
    admin.initializeApp({
        projectId: 'zonix-36dc1' // Replace with your actual project ID
    });
}

// Import the logic from index.js (We might need to export it or copy-paste for a pure standalone test)
// For simplicity in this script, let's redefine the core logic to match what's in index.js 
// so the user can see it running without dependency issues.

async function mockPerformIngestion(coachId, text, docLabel) {
    console.log(`\n--- Starting Local Test ---`);
    console.log(`[Test] Coach ID: ${coachId}`);
    console.log(`[Test] Text Length: ${text.length}`);

    // STEP 2 — Cleaning
    const cleanedText = text
        .replace(/[ \t]+/g, ' ')
        .replace(/\r/g, '')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
    console.log(`[Test] Cleaning complete.`);

    // STEP 3 — Chunking
    const paragraphs = cleanedText.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0);
    const chunks = [];
    let currentChunk = [];
    let currentWordCount = 0;
    const targetWords = 400;

    for (const paragraph of paragraphs) {
        const paragraphWords = paragraph.split(/\s+/).length;
        if (currentWordCount + paragraphWords > 550 && currentChunk.length > 0) {
            chunks.push(currentChunk.join('\n\n'));
            currentChunk = [paragraph];
            currentWordCount = paragraphWords;
        } else {
            currentChunk.push(paragraph);
            currentWordCount += paragraphWords;
            if (currentWordCount >= targetWords) {
                chunks.push(currentChunk.join('\n\n'));
                currentChunk = [];
                currentWordCount = 0;
            }
        }
    }
    if (currentChunk.length > 0) chunks.push(currentChunk.join('\n\n'));
    console.log(`[Test] Created ${chunks.length} chunks.`);

    // STEP 4 — Embedding
    const apiKey = "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";
    if (!apiKey) {
        console.error("❌ Error: OPENAI_API_KEY not found in environment.");
        return;
    }

    const openai = new OpenAI({ apiKey });
    console.log(`[Test] Fetching embeddings from OpenAI...`);

    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: chunks,
        });
        console.log(`[Test] Successfully got ${response.data.length} embeddings.`);

        // Final Summary
        console.log(`\n✅ Pipeline Check Passed!`);
        console.log(`Results: ${chunks.length} chunks would be stored in Firestore.`);

    } catch (err) {
        console.error(`❌ OpenAI Error: ${err.message}`);
    }
}

// Dummy Data
const dummyCoachId = "5zpECZx2RYHBpXkUtgAU";
const dummyText = `
Zonix is an advanced AI coaching platform. 
It allows users to forge their own digital twins or imaginative coaches.

This is a test paragraph to see how the chunking logic handles multiple sentences.
We want to make sure that small paragraphs are merged but huge ones are split properly.

Artificial Intelligence is changing the world of coaching by providing 24/7 access to personalized guidance.
With Zonix, coaches can upload their expertise as plaintext knowledge, which then gets converted into searchable vectors.
`;

// Run it
mockPerformIngestion(dummyCoachId, dummyText, "Local Development Test");
