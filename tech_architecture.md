# Zonix Technical Architecture & Stack

## 1. High-Level Overview
Zonix provides a seamless, real-time AI mentorship experience by orchestrating a high-performance React Native frontend with a serverless, event-driven backend. Our architecture prioritizes **low latency**, **data consistency**, and **cross-platform parity**.

---

## 2. Technology Stack

### Frontend (Mobile)
-   **Framework:** **React Native (Expo SDK 52)**
    -   *Why:* Allows for rapid iteration and "Over-the-Air" (OTA) updates while delivering native 60fps performance on iOS and Android.
-   **Routing:** **Expo Router (v3)**
    -   *Why:* File-based routing providing deep linking capabilities out-of-the-box (essential for sharing coach profiles).
-   **Animations:** **React Native Reanimated 3**
    -   *Why:* Runs animations on the UI thread, ensuring the "Explore Feed" and header transitions remain smooth even during heavy network activity.
-   **State Management:** **React Context + Optimistic UI**
    -   *Why:* Provides immediate user feedback (e.g., sending a message) before the server confirms, creating a "zero-latency" feel.

### Backend (Serverless)
-   **Core:** **Firebase (Google Cloud)**
-   **Database:** **Cloud Firestore**
    -   *Why:* Real-time listeners allow us to push "Online/Offline" status and typing indicators to users instantly.
-   **Compute:** **Cloud Functions (Gen 2)**
    -   *Why:* Event-driven triggers allow us to decouple logic. e.g., A new subscription event asynchronously updates the user's plan without blocking the UI.
-   **AI Inference:** **OpenAI GPT-4o** & **text-embedding-3-small**
    -   *Why:* Industry-leading reasoning capabilities combined with highly efficient vector embeddings allow for nuanced persona emulation and precise semantic retrieval.

---

## 3. RevenueCat Implementation: The Monetization Engine

Our **RevenueCat** implementation uses a **"Trusted Server Authority"** model, ensuring that entitlement logic is tamper-proof.

### Key Features & Architecture

#### A. Hybrid Verification System (The "Double-Lock")
We don't trust the client.
1.  **Client-Side (Instant):** The app uses the RevenueCat React Native SDK (`react-native-purchases`) to check `CustomerInfo.entitlements.active`. This allows for *instant* UI updates (unlocking the "Premium" badge) the second FaceID confirms the purchase.
2.  **Server-Side (Permanent):** We utilize the **RevenueCat Integration for Firebase**.
    -   *Flow:* Purchase -> RevenueCat Server -> Firebase Extension -> Firestore Write.
    -   *Benefit:* This creates a permanent, auditable record of the transaction in our own database (`users/{uid}/paymentHistory`), decoupled from the user's device state.

#### B. Native Paywalls (No-Code UI)
We leverage RevenueCat's **Paywalls** feature to dynamically A/B test our pricing pages without app store updates.
-   **Dynamic Config:** We can change the "Hero Image" or "Value Proposition" text from the RevenueCat dashboard.
-   **Native Performance:** unlike web-view based paywalls, these render as native SwiftUI/Kotlin views, feeling integrated and premium.

#### C. Cross-Platform Entitlements
Zonix users often switch devices. RevenueCat acts as the **Source of Truth** for user identity.
-   **Aliasing:** We alias the Firebase `Auth.uid` to RevenueCat's `App User ID`.
-   **Result:** A user who buys a subscription on their iPad (Apple ID) automatically has "Premium" status when they log into their Android phone (Google Play), as RevenueCat maps the receipts to the same Zonix User ID.

#### D. Event-Driven Growth Loops
We don't just process payments; we react to them.
-   **The Trigger:** `functions.firestore.document('revenuecat_events/{id}')`
-   **The Action:** When a `INITIAL_PURCHASE` event hits our server, it triggers a specialized Cloud Function that:
    1.  Atomically upgrades the user's plan type to 'Premium' via a Firestore transaction.
    2.  **Disables the Credit Consumption Middleware:** Instantly removing the "fuel tank" constraints from the chat API, enabling unlimited, uninterrupted sessions.
    3.  **Activates High-Fidelity Inference:** Reroutes the user's queries to a specialized model endpoint capable of deeper reasoning and larger context retention than the free trial.

---

## 4. Scalability Considerations

-   **Vector Search optimization:** Using semantic chunking (500 tokens) with overlap to ensure "Knowledge Chunks" don't lose context at boundaries.
-   **Cold Starts:** All Cloud Functions are modularized to reduce boot time, ensuring that "Coach Creation" (which uses AI) happens in under few seconds.
-   **Optimistic Deletion:** When a Creator deletes a coach, we hide it instantly on the client, while a background recursive function cleans up the sub-collections (`messages`, `knowledge`) to prevent data leaks.
