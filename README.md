# BLOOM

**Find a reset that feels like yours.**

## Try BLOOM — no setup required

[**Open the live demo**](https://bloom-field-guide.onrender.com)

You only need this link and a modern web browser. No GitHub access, account, installation, API key, or setup is needed to try it.

### Two-minute walkthrough

1. In **Patient**, choose **Start the sound comparison** to begin immediately with the selected scene’s sound pair. Or open **Personalize this moment (optional)** first.
2. To tailor a suggestion, choose a self-reported check-in or describe the moment, select **Shape a sensory experiment**, review the reason, and choose **Try this suggestion**.
3. Press **Play**, then rate each sound *felt better*, *no difference*, or *felt worse*. You can skip or stop at any time.
4. BLOOM saves rated experiences in this browser. Repeat a check-in later to see how your own feedback informs a future suggestion.
5. Optionally choose a reminder time and frequency. Browser reminders work only while BLOOM is open and notifications are allowed.
6. Choose **I’d like a check-in** to add a private note for yourself. Downloading your summary creates a file on your device; BLOOM does not send it to your care team.

### What to know before sharing

- Your ratings and check-in category stay in that browser on that computer. They do not follow you to another device. **My field notes** can clear saved ratings and cues.
- A free-text description stays in this browser and is used only for the current, explainable suggestion. It is not sent to an AI service or saved. Avoid names or medical details. The daily reminder preference is stored locally and notifications work only while the page is open.
- **Community** uses a shared database. Posts are held for human review, and approved posts can be seen by anyone. Use fictional text only—never enter names, contact details, or personal health information. This is not crisis support, and no professional is alerted automatically.
- Sound is generated in the browser. If you don’t hear it, press **Play** and check the computer’s volume.
- **Need support?** BLOOM is not monitored. It does not infer risk from ratings or alert anyone. In Finland, call 112 for urgent help; MIELI’s English support and booking details are linked in the app. Elsewhere, contact local emergency services or your care team.
- For the demo, use fictional examples. BLOOM is a prototype, not a medical device or treatment; it does not diagnose, detect relapse, or replace clinical care.

You don’t need to add someone as a GitHub collaborator just to let them try the live demo. Add repo access only if they need to view or change the private source code.

## Submission description

**BLOOM is a personal sensory field guide for life at home after TMS.**

This 48-hour prototype explores a modest idea: a small, optional sound ritual could help someone notice what they personally prefer in everyday moments after treatment. Start immediately or choose a self-reported check-in and describe the moment. Forest and Northern Lights each have their own pair of browser-generated sounds. Compare them using the same level setting, rate each, and see your own feedback shape a future suggestion—with a plain explanation of why it changed. Personal notes stay in the browser on the person’s device.

The optional Community space uses Aiven PostgreSQL to hold posts for human review; only approved posts appear, and they expire after 30 days. Codex helped us build and refine the working demo.

We have not formally evaluated BLOOM with people after TMS or clinicians. This is a design hypothesis, not a treatment or relapse-prevention claim. The next step is co-design and a feasibility study of clarity, usefulness, and repeat use.

[Read the two-minute pitch](PITCH.md).

## Run locally

The current version is a static browser app with no build step or API keys required.

1. Open a terminal in the project folder.
2. Run `python3 -m http.server --directory public 8000`.
3. Open <http://localhost:8000>.
4. Try a self-reported check-in, describe the moment, and compare both sound variations.

Field notes, check-in categories, and optional real-world cues stay in local storage on the browser and device where they were entered. Free-text descriptions are not saved.

## Deploy on Render

The live demo is hosted at [bloom-field-guide.onrender.com](https://bloom-field-guide.onrender.com). The Render static site is connected to this GitHub repository, serves the `public/` folder, and automatically deploys commits from `main`. Netlify is not required to run or deploy the live demo; any Netlify link attached to a pull request is only a preview.

The community API runs separately at [bloom-api-g7bg.onrender.com](https://bloom-api-g7bg.onrender.com). Its credentials belong in Render environment variables, never in Git or frontend files.

To create a separate Render copy, use the [Render Blueprint](https://dashboard.render.com/blueprint/new?repo=https://github.com/veraniemimaki/bloom-field-guide) and review the proposed resources and environment settings before applying. A visitor can try the live demo without GitHub access; the source repository remains private.

## Current status

- Demo flow: self-reported check-in or optional description → local, explainable suggestion informed by saved feedback → two generated sound variations with a shared intensity setting → user rating → personal sensory field guide.
- Saved ratings can personalize a future suggestion for the same check-in category or moment. A private 14-day panel shows recent ratings for the selected check-in, with small samples labeled as early signals rather than reliable patterns.
- Care team preview uses fictional data. The current user's local notes are shown separately and downloaded only after they choose.
- Check-in descriptions are not saved or sent to an AI service; they stay in the browser and are used only for the current local suggestion.
- Aiven PostgreSQL powers shared Community posts and the protected human-review queue. Automated post moderation and Cloudinary media delivery are not connected yet; the forest and aurora scenes remain local CSS visuals.
- The illustrated forest and procedural sounds are prototype assets.

## Development notes

Do not commit API keys, database passwords, certificates, or real health information. If integrations are added, secrets belong in server-side environment variables. Keep demo data fictional unless you have an approved research process and participant consent.

## Server-side API foundation

The `api/` service is a small Node HTTP API. It reports whether Aiven variables are present without exposing their values, and it provides the community read, submit, review-queue, and decision routes. The preference endpoint uses mock keyword-based suggestions and does not send text to an AI service. Secrets belong in Render environment variables, never in browser code or Git.

## Community and human review

The Community tab reads approved posts from Aiven PostgreSQL. Submissions are stored as pending and stay hidden until a human reviewer approves them. The reviewer queue and decisions require the `COMMUNITY_MODERATOR_TOKEN`; the frontend keeps the token only in page memory and never saves it.

Automated moderation is not connected, so all posts are held for human review. The demo has no member accounts, no automatic alert to professionals, and no crisis monitoring. Approved posts are visible to anyone visiting the site. Use fictional content and do not enter names, contact details, treatment advice, or personal health information. Posts expire after 30 days.


## Aiven PostgreSQL integration groundwork

The API now has an optional Aiven PostgreSQL connection for community posts and the human-review queue. It reads `AIVEN_DATABASE_URL`, verifies TLS with `AIVEN_CA_CERT`, and uses `COMMUNITY_MODERATOR_TOKEN` to protect reviewer endpoints. The API creates the table and indexes from [`api/schema.sql`](api/schema.sql) when the database is configured; records expire after 30 days.

Aiven is connected to the live API and Community frontend. The service initializes the table from `api/schema.sql`; API-submitted posts remain pending until a human approves them. Only approved posts are returned publicly. Automated moderation is not connected. Do not put credentials in Git or submit real health information.

Aiven's Node.js connection guidance uses the `pg` package and its PostgreSQL guidance describes the TLS CA requirements: [Aiven Node.js connection guide](https://aiven.io/docs/products/postgresql/howto/connect-node), [Aiven TLS certificates](https://aiven.io/docs/platform/concepts/tls-ssl-certificates).


## Cloudinary scene images

The optional scene-image control uses Cloudinary's Upload Widget for a user-selected landscape, then delivers a responsive crop with `c_fill,g_auto,w_1400,h_420,q_auto,f_auto`. The upload controls appear after `public/cloudinary-config.js` has a Cloudinary cloud name and an unsigned upload preset. Configure the preset to accept only JPG/PNG/WebP, use a dedicated `bloom-scenes` folder, and prevent overwrites. The cloud name and preset name are public identifiers; never put an API secret in frontend code. Upload only non-sensitive images you have permission to use; unsigned uploads create publicly deliverable assets. The existing CSS forest and aurora backdrops work without Cloudinary.


## Winter sound profiles

The northern-lights scene now offers two additional browser-generated sounds: **Snowfall hush** (soft, slowly wavering filtered noise) and **Distant ice chimes** (sparse, rounded synthesized tones). The forest keeps its wind and leaf pair. Ratings are saved with their scene and only inform later suggestions in that same scene, so northern-lights preferences do not get mixed with forest preferences. No audio service or API key is required.


