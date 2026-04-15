# Project Blueprint: Nexus AI (Synced to MongoDB)

## 1. Architecture Overview
Nexus AI is a full-stack application built with React (Vite), Express, and MongoDB. It features a high-fidelity, futuristic UI with real-time chat capabilities, neural analysis (thinking logs), and persistent memory backed by a cloud database.

## 2. Advanced Architecture & Memory Protocol
- **MongoDB Integration:** All structural data (file maps, function locations, error logs) is stored in MongoDB for long-term persistence and project isolation.
- **GitHub Synergy:** Integrated with GitHub API for version control and code auditing.
- **Pre-Flight Retrieval:** Automated context restoration on application startup.

## 2. File Map

### Core Frontend
- `/src/main.tsx`: Application entry point. Mounts the React app.
- `/src/App.tsx`: The heart of the application.
  - **State Management:** Handles chat history, theme, sidebar state, model/mode selection, and streaming.
  - **Components:** `ChatMessage` (renders individual messages with neural logs), `CodeBlock` (syntax-highlighted code), `App` (main layout).
  - **Minimalist Workspace:** The input area features an integrated, borderless design that glows with a subtle blue accent on focus, ensuring a "Free Space" feel without browser-default borders.
  - **Services:** Integrates with `/api/chat` for AI responses and `/api/messages` for history.
- `/src/index.css`: Global styling using Tailwind CSS. Defines custom neural-themed colors and animations.

### Backend & API
- `/server.ts`: Express server.
  - **Middleware:** Vite middleware for dev, static serving for production.
  - **Routes:**
    - `GET /api/messages`: Fetches chat history from Firestore.
    - `POST /api/chat`: Handles AI interaction (Gemini API).
    - `POST /api/messages/clear`: Clears chat history.

### Infrastructure & Config
- `/src/firebase.ts`: Initializes Firebase Auth and Firestore.
- `/firebase-applet-config.json`: Firebase project credentials.
- `/firebase-blueprint.json`: IR for Firestore data structure.
- `/firestore.rules`: Security rules for Firestore.
- `/package.json`: Project dependencies and scripts.
- `/metadata.json`: Application name, description, and permissions.

### Documentation & Rules
- `/AGENTS.md`: Behavioral framework and system instructions.
- `/PROJECT_BLUEPRINT.md`: This file. The living map of the codebase.

## 3. Data Models (Firestore)
- **Collection: `messages`**
  - `role`: "user" | "assistant" | "system"
  - `content`: string (includes `<thought>` tags for neural logs)
  - `timestamp`: ISO 8601 string
  - `uid`: string (User ID)

## 4. Key Functions & Scopes
- `handleSubmit` (App.tsx): Manages the chat submission flow, including optimistic updates and streaming.
- `fetchMessages` (App.tsx): Syncs local state with Firestore.
- `startServer` (server.ts): Initializes the Express/Vite environment.
