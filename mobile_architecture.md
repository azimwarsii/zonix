# Zonix Mobile Architecture Documentation

## 1. Architectural Pattern
Zonix follows a **Feature-First, Modular Architecture** utilizing **Expo Router** for navigation and **React Context** for global state management. The application is designed to be "Offline-First" where possible and "Real-Time" by default.

---

## 2. Directory Structure & Organization

The codebase is organized to separate concerns between "Screens" (Routes) and "Logic" (Components/Hooks).

```
/app                # File-based Routing (Expo Router)
  ├── (tabs)        # Main Tab Navigator (Explore, Create, Profile)
  ├── coach         # Dynamic Routes for Coach Profiles ([id].tsx)
  ├── message       # Chat Interface ([id].tsx)
  └── _layout.tsx   # Root Layout (Providers, Theme, Toast)

/components         # Reusable UI Atoms & Molecules
  ├── ui            # Base elements (Buttons, Inputs)
  ├── specialized   # Complex widgets (CharacterCard, ChatBubble)
  └── themed        # Color-scheme aware wrappers (ThemedText, ThemedView)

/context            # Global State Managers
  └── AuthContext   # User Session, Credits, Subscription Status

/hooks              # Custom React Hooks
  ├── useColorScheme # Theme management
  └── useLoadedAssets # Font/Asset preloading

/functions          # Serverless Backend (Firebase Cloud Functions)
```

---

## 3. Navigation Strategy (Expo Router)
We leverage **Expo Router v3** to map the file system directly to the navigation stack.

-   **Deep Linking:** Every screen is addressable via URL (e.g., `zonix://coach/123`). This allows for seamless sharing and push notification handling.
-   **Layout Injection:**
    -   `app/_layout.tsx`: Wraps the entire app in `AuthProvider`, `ThemeProvider`, and `GestureHandlerRootView`.
    -   `app/(tabs)/_layout.tsx`: Defines the bottom tab navigator with custom blurred backgrounds and haptic feedback.
-   **Dynamic Routes:**
    -   `app/coach/[id].tsx`: Uses the `[id]` wildcard to fetch specific coach data securely.

---

## 4. State Management & Data Flow

### A. Global State (React Context)
We avoid heavy state libraries (Redux/Zustand) in favor of **React Context** for truly global data, keeping the app lightweight.
-   **`AuthContext`:** The "Brain" of the app. It handles:
    -   Firebase `onAuthStateChanged` listener.
    -   `RevenueCat` entitlement checks (Pro vs Free).
    -   Real-time `user` document sync (Credit balance updates).

### B. Local State & Optimistic UI
For high-frequency interactions (Chat, Liking), we use **Optimistic Updates**.
1.  **User Action:** User taps "Send".
2.  **Optimistic Update:** UI immediately renders the message bubble.
3.  **Background Sync:** Firestore `add()` is called.
4.  **Reconciliation:** If the write fails, the UI rolls back and shows an error toast.

---

## 5. UI/UX Architecture

### A. Theming Engine
Zonix implements a **System-Adaptive Theme**.
-   **`ThemedView` / `ThemedText`:** Wrappers that automatically switch colors based on `useColorScheme()` (Dark/Light mode).
-   **Constants:** All colors are defined in `constants/Colors.ts`, ensuring consistency across the app.

### B. Animation System
We use **React Native Reanimated 3** for high-performance animations that run on the UI thread.
-   **Shared Element Transitions:** smooth morphing of coach avatars from the "Feed" to the "Profile".
-   **Scroll Animations:** The "Explore" header sticky/hide behavior is driven by `useAnimatedScrollHandler` to prevent JS-bridge bottlenecks.

---

## 6. Performance Optimization
-   **List Virtualization:** `FlashList` (or optimized `FlatList`) is used for the Infinite Scroll feed to recycle views efficiently.
-   **Memoization:** `useCallback` and `useMemo` are aggressively used to prevent unnecessary re-renders of complex components like `CharacterCard`.
-   **Lazy Loading:** Heavy assets (like high-res portraits) uses progressive caching strategies.
