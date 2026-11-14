# BLOOM

**Find a reset that feels like yours.**

## Live demo

**[Open BLOOM](https://bloom-field-guide.onrender.com)**

### Two-minute judge walkthrough

1. In **Patient**, choose a self-reported example or describe the moment, such as “indoors, tired, and wanting something steady.”
2. Select **Shape a sensory experiment**. BLOOM uses local keyword rules and your saved ratings to suggest a moment and sound; inspect the explanation and edit either choice.
3. Start the experiment. Set the sound level once for both sounds, play each browser-generated variation, and rate how each felt.
4. Return to the start screen and repeat a similar check-in. The suggestion can now use ratings saved from the earlier check-in.
5. Open **My field guide** for personal notes or **Care summary** to review and download a summary you decide whether to share.
6. Choose **Preview a fictional returning-user example** to see sample history kept separate from personal notes.

Switch between **Forest** and **Northern lights** in the banner; this changes the visual backdrop while keeping the sound experiment the same.

Free-text descriptions are read in the browser only, then discarded. They are not saved or sent. BLOOM saves the selected check-in category and sound feedback in local storage on that device. The two soundscapes are synthesized in the browser. Allow audio playback when your browser asks.

## What BLOOM does

BLOOM is a prototype sensory field guide for people returning home after TMS. It lets someone describe or choose a moment, shape a short nature-inspired sound experiment, record how each variation felt, and build a personal guide from those responses. The care summary is generated from the user's own saved notes and is only downloaded when they choose.

This is an early demo, not a medical device or treatment. It does not measure brain activity, diagnose depression, detect relapse, or replace clinical care. Its suggestion logic is a small, explainable keyword rule—not an AI model or a reading of someone's mental state.

## Run locally

The current version is a static browser app with no build step or API keys required.

1. Open a terminal in the project folder.
2. Run `python3 -m http.server --directory public 8000`.
3. Open <http://localhost:8000>.
4. Try a self-reported check-in, describe the moment, and compare both sound variations.

Field notes, check-in categories, and optional real-world cues stay in local storage on the browser and device where they were entered. Free-text descriptions are not saved.

## Recreate on Render

The repo includes a Render Blueprint at [`render.yaml`](render.yaml), configured for this app (no build command; publish only the `public/` frontend folder, keeping server code outside the static site).

To create your own Render copy, you need access to this private GitHub repo and a Render account connected to GitHub. Then open [Create a Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/veraniemimaki/bloom-field-guide), review the proposed static site, and apply it. Render will give your copy its own public `onrender.com` URL.

Judges can use the live demo link above without GitHub repo access. The source repo remains private.

## Current status

- Demo flow: self-reported check-in or optional description → local, explainable suggestion informed by saved feedback → two generated sound variations with a shared intensity setting → user rating → personal sensory field guide.
- Saved ratings can personalize a future suggestion for the same check-in category or moment.
- Care summary reviews only the current user's local notes and downloads a text file only after the user chooses.
- Check-in descriptions are never saved or sent; only the matched category and ratings are stored in this browser.
- Sponsor services are not connected yet. Planned integrations are optional ElevenLabs narration, Gemini preference parsing, Cloudinary media delivery, and Aiven persistence. Gemma on Modal is a stretch goal.
- The illustrated forest and procedural sounds are prototype assets.

## Development notes

Do not commit API keys, database passwords, certificates, or real health information. If integrations are added, secrets belong in server-side environment variables. Keep demo data fictional unless you have an approved research process and participant consent.

## Server-side API foundation

The `api/` service is a small Node HTTP API with:
- `GET /api/health` for Render health checks.
- `POST /api/preferences/interpret` for a mock, keyword-based context suggestion.

The browser app currently uses its own local rule-based interpreter and does not call this endpoint or an AI model. The mock endpoint stores no submitted text. Provider keys belong in Render environment variables, never in browser code or Git.

## Community moderation concept

The Community tab is an interactive, single-browser prototype. It includes fictional peer notes, a mock rule-based moderation check, and a simulated human-review queue. Flagged posts stay hidden from the demo room until a reviewer approves or removes them in the UI.

This is not a live chat: posts are not shared between visitors, Gemini is not connected, the review screen is not protected, and no professional is alerted. Use fictional messages only. A real release needs shared storage, authenticated reviewer access, Gemini moderation, staffed human review, and a reviewed escalation process.

## Aiven PostgreSQL integration groundwork

The API now has an optional Aiven PostgreSQL connection for community posts and the human-review queue. It reads `AIVEN_DATABASE_URL`, verifies TLS with `AIVEN_CA_CERT`, and uses `COMMUNITY_MODERATOR_TOKEN` to protect reviewer endpoints. The API creates the table and indexes from [`api/schema.sql`](api/schema.sql) when the database is configured; records expire after 30 days.

This is groundwork only. The live Community tab remains a local prototype until an Aiven service and its credentials are configured and the frontend is connected. Gemini moderation is not connected; API-submitted posts are held pending human review. Only approved posts are returned publicly. Do not put credentials in Git or submit real health information.

Aiven's Node.js connection guidance uses the `pg` package and its PostgreSQL guidance describes the TLS CA requirements: [Aiven Node.js connection guide](https://aiven.io/docs/products/postgresql/howto/connect-node), [Aiven TLS certificates](https://aiven.io/docs/platform/concepts/tls-ssl-certificates).


## Cloudinary scene images

The optional scene-image control uses Cloudinary's Upload Widget for a user-selected landscape, then delivers a responsive crop with `c_fill,g_auto,w_1400,h_420,q_auto,f_auto`. The upload controls appear after `public/cloudinary-config.js` has a Cloudinary cloud name and an unsigned upload preset. Configure the preset to accept only JPG/PNG/WebP, use a dedicated `bloom-scenes` folder, and prevent overwrites. The cloud name and preset name are public identifiers; never put an API secret in frontend code. Upload only non-sensitive images you have permission to use; unsigned uploads create publicly deliverable assets. The existing CSS forest and aurora backdrops work without Cloudinary.
