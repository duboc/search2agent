# Search to Agent Simulation (Bradesco BIA)

This project is a React and Express application demonstrating a user journey from a search engine result directly into an AI agent experience. It uses the Gemini 3.0 Flash model via Google Cloud Vertex AI to power the chat experience.

## Features

- **Search Stage:** A simulated search engine interface.
- **Results Stage:** Simulated search results featuring an interactive ad component.
- **Agent Stage:** A chat interface simulating a conversation with Bradesco's BIA assistant, powered by Google Cloud Vertex AI and Gemini.
- **Full-stack Setup:** Includes both a Vite React frontend and an Express backend, easily run together concurrently.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A [Google Cloud Project](https://cloud.google.com/) with the Vertex AI API enabled.
- [Google Cloud CLI](https://cloud.google.com/sdk/gcloud) (`gcloud`) installed and authenticated, or a valid Service Account key for Application Default Credentials.

## Setup & Configuration

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Copy the example environment file and configure it with your Google Cloud details:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and configure your settings:
   - `GOOGLE_CLOUD_PROJECT`: Your actual Google Cloud Project ID.
   - `GOOGLE_CLOUD_LOCATION`: (Optional) Default is `us-central1`.
   - `GEMINI_MODEL_ID`: (Optional) Default is `gemini-3.0-flash`.

3. **Google Cloud Authentication:**
   The backend uses Google Gen AI SDK for Vertex AI, which relies on Google Application Default Credentials (ADC).
   Before running the app, make sure you are authenticated locally:
   ```bash
   gcloud auth application-default login
   ```
   *(Alternatively, you can set the `GOOGLE_APPLICATION_CREDENTIALS` environment variable to point to a service account JSON key).*

## Running Locally

You can start both the React frontend and the Express backend simultaneously with a single command:

```bash
npm run dev
```

This uses `concurrently` to run:
- **Frontend:** Vite dev server (typically on `http://localhost:5173`)
- **Backend:** Express API server (on `http://localhost:3001`)

Open your browser to the URL provided by Vite (usually `http://localhost:5173`) to experience the flow.

## Available Scripts

- `npm run dev` - Runs both the frontend and backend concurrently in development mode.
- `npm run dev:frontend` - Runs only the Vite dev server.
- `npm run dev:backend` - Runs only the Express backend server.
- `npm run build` - Builds the frontend for production.
- `npm run lint` - Runs ESLint to check for code quality.

## Built With

- **Frontend:** React, Vite, Framer Motion, Lucide React
- **Backend:** Express, Node.js, `@google/genai` (Vertex AI SDK)
