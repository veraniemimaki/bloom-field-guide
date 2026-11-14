# BLOOM

**Find a reset that feels like yours.**

## Live demo

**[Open BLOOM](https://bloom-field-guide.onrender.com)**

### Two-minute judge walkthrough

1. Choose a moment, such as **Take a small pause**, then select **Begin the experience**.
2. Play **Soft wind** and choose how it felt.
3. Play **Rustling leaves** and give a response.
4. Review the suggested recipe and the notes behind it.
5. After saving feedback, return to the start screen and choose **Open my field guide** to see your own notes and support cues on this device.
6. Choose **Preview a fictional returning-user example** to see sample history kept separate from personal notes.

The two soundscapes are synthesized in the browser. Allow audio playback when your browser asks.

## What BLOOM does

BLOOM is a prototype sensory field guide for people returning home after TMS. It lets someone compare short variations of a nature-inspired scene, record how each felt, and keep a recipe they can replay or edit.

This is an early demo, not a medical device or treatment. It does not measure brain activity, diagnose depression, detect relapse, or replace clinical care.

## Run locally

The current version is a static browser app with no build step or API keys required.

1. Open a terminal in the project folder.
2. Run `python3 -m http.server --directory public 8000`.
3. Open <http://localhost:8000>.
4. Choose a context and try both sound variations, or preview the fictional returning-user example.

Field notes and optional support cues are stored only in the browser and device where they were entered, using local storage.

## Recreate on Render

The repo includes a Render Blueprint at [`render.yaml`](render.yaml), configured for this app (no build command; publish only the `public/` frontend folder, keeping server code outside the static site).

To create your own Render copy, you need access to this private GitHub repo and a Render account connected to GitHub. Then open [Create a Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/veraniemimaki/bloom-field-guide), review the proposed static site, and apply it. Render will give your copy its own public `onrender.com` URL.

Judges can use the live demo link above without GitHub repo access. The source repo remains private.

## Current status

- Working demo flow: context → optional personal support cue → two sound variations → feedback → recipe.
- A recipe only recommends a sound when at least one saved response says it felt better; skips, neutral responses, and negative responses do not create a false favorite.
- Personal field guide summarizes the user's own notes by moment; the fictional returning-user example stays separate.
- Sponsor services are not connected yet. Planned integrations are optional ElevenLabs narration, Gemini preference parsing, Cloudinary media delivery, and Aiven persistence. Gemma on Modal is a stretch goal.
- The illustrated forest and procedural sounds are prototype assets.

## Development notes

Do not commit API keys, database passwords, certificates, or real health information. When integrations are added, secrets belong in server-side environment variables. Keep demo data fictional unless you have an approved research process and participant consent.

## Server-side API foundation

The `api/` service is a small Node HTTP API with:
- `GET /api/health` for Render health checks.
- `POST /api/preferences/interpret` for a mock, keyword-based context suggestion.

The mock endpoint stores no submitted text and does not use an AI model. The current browser app does not call it yet. Do not send real or identifying health information in this prototype. Provider keys belong in Render environment variables, never in browser code or Git.

