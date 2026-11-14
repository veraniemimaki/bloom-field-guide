# BLOOM

**Find a reset that feels like yours.**

## Live demo

**[Open BLOOM](https://bloom-field-guide.onrender.com)**

### Two-minute judge walkthrough

1. In **Patient**, choose a self-reported example or describe the moment, such as “indoors, tired, and wanting something steady.”
2. Select **Shape a sensory experiment**. BLOOM uses local keyword rules and your saved ratings to suggest a moment and sound; inspect the explanation and edit either choice.
3. Start the experiment. Set the sound level once for both sounds, play each browser-generated variation, and rate how each felt.
4. Return to the start screen and repeat a similar check-in. The suggestion can now use ratings saved from the earlier check-in.
5. Open **My field guide** for personal notes. **Care team preview** shows a fictional, consent-based follow-up timeline and lets you draft (but not send) a check-in; your own local notes and export are below it.
6. Choose **Preview a fictional returning-user example** to see sample history kept separate from personal notes.

Switch between **Forest** and **Northern lights** in the banner; this changes the visual backdrop while keeping the sound experiment the same.

Free-text descriptions are read in the browser only, then discarded. Optional phone movement is sampled only after a user taps the button; raw readings stay in memory for six seconds, are discarded, and are never transmitted. If the user rates that session, only the broad still/moving category is saved with the rating in local browser storage. Learning compares measured and simulated samples separately. The movement cue describes device movement only, not mood or health. BLOOM saves the selected check-in category, sound feedback, and optional real-world cues in local storage on that device. The My field notes dialog can clear those saved notes and cues. The two soundscapes are synthesized in the browser. Allow audio playback when your browser asks.

## What BLOOM does

BLOOM is a prototype sensory field guide for people returning home after TMS. It lets someone describe or choose a moment, shape a short nature-inspired sound experiment, record how each variation felt, and build a personal guide from those responses. The care team preview uses fictional sample data to demonstrate a possible consent-based follow-up workflow. A person's own notes remain local and are only downloaded when they choose.

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
- Saved ratings can personalize a future suggestion for the same check-in category or moment. A private 14-day panel shows recent ratings for the selected check-in, with small samples labeled as early signals rather than reliable patterns.
- Care team preview uses fictional data. The current user's local notes are shown separately and downloaded only after they choose.
- Check-in descriptions are never saved or sent; only the matched category and ratings are stored in this browser.
- Aiven PostgreSQL powers shared Community posts and the protected human-review queue. Gemini moderation and Cloudinary media delivery are not connected yet; the forest and aurora scenes remain local CSS visuals.
- The illustrated forest and procedural sounds are prototype assets.

## Development notes

Do not commit API keys, database passwords, certificates, or real health information. If integrations are added, secrets belong in server-side environment variables. Keep demo data fictional unless you have an approved research process and participant consent.

## Server-side API foundation

The `api/` service is a small Node HTTP API. It reports whether Aiven variables are present without exposing their values, and it provides the community read, submit, review-queue, and decision routes. The preference endpoint remains a mock keyword-based suggestion; BLOOM does not send free-text moment descriptions to an AI provider. Secrets belong in Render environment variables, never in browser code or Git.

## Community and human review

The Community tab reads approved posts from Aiven PostgreSQL. Submissions are stored as pending and stay hidden until a human reviewer approves them. The reviewer queue and decisions require the `COMMUNITY_MODERATOR_TOKEN`; the frontend keeps the token only in page memory and never saves it.

Gemini moderation is not connected, so all posts are held for human review. The demo has no member accounts, no automatic alert to professionals, and no crisis monitoring. Approved posts are visible to anyone visiting the site. Use fictional content and do not enter names, contact details, treatment advice, or personal health information. Posts expire after 30 days.


## Aiven PostgreSQL integration groundwork

The API now has an optional Aiven PostgreSQL connection for community posts and the human-review queue. It reads `AIVEN_DATABASE_URL`, verifies TLS with `AIVEN_CA_CERT`, and uses `COMMUNITY_MODERATOR_TOKEN` to protect reviewer endpoints. The API creates the table and indexes from [`api/schema.sql`](api/schema.sql) when the database is configured; records expire after 30 days.

Aiven is connected to the live API and Community frontend. The service initializes the table from `api/schema.sql`; API-submitted posts remain pending until a human approves them. Only approved posts are returned publicly. Gemini moderation is not connected. Do not put credentials in Git or submit real health information.

Aiven's Node.js connection guidance uses the `pg` package and its PostgreSQL guidance describes the TLS CA requirements: [Aiven Node.js connection guide](https://aiven.io/docs/products/postgresql/howto/connect-node), [Aiven TLS certificates](https://aiven.io/docs/platform/concepts/tls-ssl-certificates).


## Cloudinary scene images

The optional scene-image control uses Cloudinary's Upload Widget for a user-selected landscape, then delivers a responsive crop with `c_fill,g_auto,w_1400,h_420,q_auto,f_auto`. The upload controls appear after `public/cloudinary-config.js` has a Cloudinary cloud name and an unsigned upload preset. Configure the preset to accept only JPG/PNG/WebP, use a dedicated `bloom-scenes` folder, and prevent overwrites. The cloud name and preset name are public identifiers; never put an API secret in frontend code. Upload only non-sensitive images you have permission to use; unsigned uploads create publicly deliverable assets. The existing CSS forest and aurora backdrops work without Cloudinary.
