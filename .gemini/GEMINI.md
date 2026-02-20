# Search to Agent: Architecture & Development Guide

This document outlines the architecture, setup instructions, and the remaining implementation gaps for the Search2Agent (Bradesco BIA) project.

## 🎯 Objective
Create a seamless journey where a simulated search engine result redirects the user into an immersive AI agent interaction. The agent acts as "BIA" (Bradesco Artificial Intelligence) specializing in debt negotiation.

There are two primary journeys:
1.  **Text Journey:** Traditional chat interface with rich UI elements (debt summary cards, PIX codes, simulations).
2.  **Voice Journey:** Real-time voice interaction with live audio streaming, transcription, and a conversational chat log.

---

## 🛠 Tech Stack

| Layer | Choice |
|-------|--------|
| **Frontend** | React (Vite), Framer Motion, Lucide React |
| **Backend** | Express (Node.js), `ws` (WebSockets) |
| **AI SDK** | `@google/genai` (Google Gen AI SDK for Vertex AI) |
| **Auth** | `google-auth-library` (Application Default Credentials) |

---

## 🤖 Models & Cloud Configuration

The project uses two distinct Gemini models depending on the journey:

1.  **Text Journey (Standard Chat)**
    *   **Model:** `gemini-3-flash-preview`
    *   **Location:** `global`
    *   **Usage:** Used in `vite.config.js` (Vite plugin for `/api/chat`) and `server.js` (`/api/chat` POST endpoint).

2.  **Voice Journey (Live API)**
    *   **Model:** `gemini-live-2.5-flash-native-audio`
    *   **Location:** `us-central1`
    *   **Voice:** `Kore` (feminine voice)
    *   **Usage:** Used via WebSocket Proxy on `server.js`. The `GeminiLiveAPI` client connects to the proxy at `ws://localhost:3001/ws/gemini-live`, which forwards requests to the Vertex AI Bidi Service at `wss://us-central1-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`.

*(These configurations are defined in the `.env` file. See `.env.example` for reference.)*

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `server.js` | Express backend with WebSocket proxy for Gemini Live API + text chat endpoint |
| `vite.config.js` | Vite config with inline `/api/chat` plugin (also handles text chat in dev) |
| `src/api/geminiLiveApi.js` | Client-side Gemini Live API wrapper (WebSocket, setup messages, audio streaming) |
| `src/api/prompts.js` | System instructions for the voice agent (BIA personality & conversation flow) |
| `src/api/geminiApi.js` | Client-side text chat API helper |
| `src/components/VoiceAgentStage.jsx` | Voice call UI with avatar, transcription log, and audio controls |
| `src/components/AgentStage.jsx` | Text chat UI with rich interactive elements |
| `src/utils/audioStreamer.js` | AudioStreamer (mic capture) and AudioPlayer (PCM playback) utilities |
| `public/audio-processors/` | Web Audio API worklets for capture and playback |

---

## 🚀 How to Run

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Environment Variables:**
    Copy the sample environment file and update it with your GCP details.
    ```bash
    cp .env.example .env
    ```
    Required variables:
    - `GOOGLE_CLOUD_PROJECT` — Your GCP project ID (must not be `seu-projeto-aqui`)
    - `GOOGLE_CLOUD_LOCATION` / `GOOGLE_CLOUD_LOCATION_TEXT` — Location for text model (default: `global`)
    - `GEMINI_MODEL_ID` / `GEMINI_MODEL_ID_TEXT` — Text model ID
    - `GOOGLE_CLOUD_LOCATION_VOICE` — Location for voice model (default: `us-central1`)
    - `GEMINI_MODEL_ID_VOICE` — Voice model ID

3.  **Authentication:**
    Make sure you have valid Application Default Credentials (ADC) configured locally. This is required by the `google-auth-library` to generate short-lived access tokens used by the WebSocket proxy.
    ```bash
    gcloud auth application-default login
    ```

4.  **Start Development Server:**
    Run both the Vite frontend and Express backend concurrently.
    ```bash
    npm run dev
    ```
    - Frontend: `http://localhost:5173`
    - Backend: `http://localhost:3001`

---

## ⚠️ Known Issues & Gotchas (Lessons Learned)

### Config Fetch URL
The Voice Journey fetches config from `http://localhost:3001/api/config` (the backend server), NOT from the Vite dev server. The Vite plugin only handles `/api/chat`. If the frontend uses a relative URL (`/api/config`), it hits the Vite dev server which returns a 404, causing the client to fall back to the placeholder project ID.

### React StrictMode & WebSockets
React's `<StrictMode>` in development causes components to mount → unmount → remount. For WebSocket connections, this means:
- The first mount creates a connection, then cleanup runs and disconnects it.
- The second mount creates a fresh connection that actually persists.
- **Do NOT use a `useRef` flag** to prevent double initialization — refs persist across the StrictMode cycle and will block the second mount. Instead, use a `cancelled` flag inside the `useEffect` closure.

### Dual `.env` Variable Names
The `vite.config.js` plugin reads `GOOGLE_CLOUD_LOCATION` and `GEMINI_MODEL_ID` (legacy names), while `server.js` reads `GOOGLE_CLOUD_LOCATION_TEXT` and `GEMINI_MODEL_ID_TEXT`. Both sets must be present in `.env` for both text chat paths to work.

### WebSocket Setup Message Format
The Gemini Live API setup message must include `tools: { function_declarations: [...] }` even when empty. Omitting this field entirely can cause the upstream to reject the connection. Match the format from the working reference implementation exactly.

### Port Conflicts
When restarting the dev servers, the backend may fail with `EADDRINUSE` if the previous Node process is still running. Kill it first:
```bash
lsof -ti:3001 | xargs kill -9
```

---

## 🚧 What is Missing / Next Steps

### 1. Voice Journey Function Calling (Tools)
*   **Current State:** The Voice Agent streams audio and displays transcriptions, but does not trigger interactive UI elements (debt summary, PIX code, etc.).
*   **To Do:**
    *   Define `FunctionCallDefinition` instances for UI actions (e.g., `show_debt_summary`, `show_pix`).
    *   Handle `TOOL_CALL` responses in `VoiceAgentStage.jsx` to render the same rich components used in `AgentStage.jsx`.

### 2. Audio Interruption Buffer Flush
*   **Current State:** Basic interruption is handled, but the audio playback queue needs a more robust buffer flush when the user interrupts BIA mid-speech.
*   **To Do:** Implement an immediate buffer clear in the AudioPlayer worklet when `INTERRUPTED` is received.

### 3. Automatic Reconnection
*   **Current State:** If the WebSocket disconnects (10-15 min timeout, token expiration), it shows an error state.
*   **To Do:** Implement automatic reconnection with fresh access token in `GeminiLiveAPI`.

### 4. Consolidate System Prompts
*   **Current State:** The text journey system prompt is hardcoded in both `vite.config.js` and `server.js`.
*   **To Do:** Move all system prompts into `src/api/prompts.js` so they're managed in one place.

### 5. Mock / Real Backend Services
*   **Current State:** The system simulates finding debts and generating PIX codes via LLM.
*   **To Do:** Create actual backend service interfaces to securely fetch (or realistically simulate) debts based on CPF.

### 6. Production Deployment
*   **To Do:** Remove the Vite plugin chat handler (only needed for dev), use the `server.js` as the single backend, and configure proper CORS / auth for production.
