# BLOOM

**Find a reset that feels like yours.**

BLOOM is a prototype sensory field guide for people returning home after TMS. It lets someone compare short variations of a nature-inspired scene, record how each felt, and keep a recipe they can replay or edit.

This is an early demo, not a medical device or treatment. It does not measure brain activity, diagnose depression, detect relapse, or replace clinical care.

## Run the prototype

The current version is a static browser app with no build step or API keys required.

1. Open a terminal in this folder.
2. Run `python3 -m http.server 8000`.
3. Open <http://localhost:8000> in a browser.
4. Choose a context and try both sound variations, or select **Preview a returning-user example** to see clearly labeled fictional history.

Field notes are currently stored in that browser on that device using local storage. The illustrated forest and procedural sounds are prototype assets.

## Current status

- Working demo flow: context → two sound variations → feedback → recipe.
- Fictional returning-user example is kept separate from personal field notes.
- Sponsor services are not connected yet. Planned integrations are optional ElevenLabs narration, Gemini preference parsing, Cloudinary media delivery, and Aiven persistence. Gemma on Modal is a stretch goal.

## Development notes

Do not commit API keys, database passwords, certificates, or real health information. When integrations are added, secrets belong in server-side environment variables. Keep demo data fictional unless you have an approved research process and participant consent.
