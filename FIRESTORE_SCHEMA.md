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

### `coaches` (Upcoming)
Documents representing AI coaches.

| Field | Type | Description |
| :--- | :--- | :--- |
| `name` | string | Coach name. |
| `persona` | string | AI personality definition. |
| `creatorId` | string | Reference to the `uid` of the user who created it. |
| `likes` | number | Total likes count. |
| `follows` | number | Total followers count. |
| `chatsCount` | number | Total number of people who have chatted with this coach. |
| `ragConfig` | object | Knowledge base configuration. |

---

### `userMemories` (Upcoming)
Tracking user interactions with specific coaches.

**Path**: `userMemories/{uid}/interactions/{coachId}`

| Field | Type | Description |
| :--- | :--- | :--- |
| `memory` | string | Summary of past interactions. |
| `lastChatAt` | timestamp | Last time the user talked to this coach. |
