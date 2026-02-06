# Firestore Schema Documentation

This document outlines the data structure for the Zonix application in Firebase Firestore.

## Collections

### `users`
Documents are indexed by the Firebase Authentication `uid`.

| Field | Type | Description |
| :--- | :--- | :--- |
| `userName` | string | Randomly generated unique username (checked for existence). |
| `email` | string | Primary contact email. |
| `planType` | string | Current subscription level (e.g., "Free", "Pro"). |
| `credits` | number | Remaining balance of Coins. |
| `paymentHistory` | array | List of payment objects (transaction ID, amount, date). |
| `redeemedCodes` | array | List of promo codes the user has already redeemed (prevents duplicates). |
| `persona` | string | Selected user persona. |
| `notifications` | boolean | User notification preference. |
| `active_messaging` | boolean | Active messaging status. |
| `calls` | boolean | Calls capability status. |
| `createdAt` | timestamp | Server timestamp of account creation. |
| `updatedAt` | timestamp | Server timestamp of last profile update. |

---

### `coaches`
Documents representing forged AI coaches.

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | string | Unique identifier (Auto-generated). |
| `type` | string | `clone` or `imaginative`. |
| `creatorId` | string | UID of creator. |
| `name` | string | Coach name. |
| `portraitUrl` | string | Storage URL for portrait image (Clones only). |
| `specialization` | string | e.g. "Software Engineering". |
| `yearsOfExpertise` | number | level of experience (Clones only). |
| `isVerified` | boolean | Verification status. |
| `essence` | map | Selected traits (e.g., "Talk Style", "Temperament"). |
| `advanced.primaryGreeting` | string | Initial message. |
| `advanced.whoAmI` | string | Bio/Identity (Imaginative only). |
| `advanced.socialLinks` | map | Instagram, Twitter, etc. |
| `knowledge.textRecords` | string | Core wisdom and custom rules. |
| `knowledge.lastSyncAt` | timestamp | Last time the knowledge base was updated. |
| `stats` | map | `{ likes, follows, chats }`. |
| `createdAt` | timestamp | Creation time. |
| `updatedAt` | timestamp | Last update time. |

---

### `userMemories` (Upcoming)
Tracking user interactions with specific coaches.

**Path**: `userMemories/{uid}/interactions/{coachId}`

| Field | Type | Description |
| :--- | :--- | :--- |
| `memory` | string | Summary of past interactions. |
| `lastChatAt` | timestamp | Last time the user talked to this coach. |
