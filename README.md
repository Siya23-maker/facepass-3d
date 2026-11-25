# FacePass — 3D Gym Access Prototype

**Live demo:** https://siya23-maker.github.io/facepass-3d/

A local, browser-based proof of concept for face-based gym entry.
Real face **detection** (MediaPipe) + **simulated** recognition + a synthetic membership
database, connected to a 3D entrance with a working turnstile.

## Run it (Windows, VS Code terminal)

```powershell
cd C:\Users\gagib\facepass-3d
npm install      # downloads libraries + sets up the face model (needs internet once)
npm run dev      # starts the local server and opens http://localhost:5173
```

Stop the server with **Ctrl + C**. If `npm install` printed
"Could not download face model", run `npm run setup` once while online.

## How to use the demo

**Easiest:** click **▶ Guided demo**. The member walks in through the door, goes to the
FacePass tablet on the entrance counter, gets scanned, and walks through the turnstile.

**Manually:**
1. Walk the member (W A S D / arrow keys) through the revolving door to the **STAND HERE** marker beside the counter.
2. Click **Activate camera** and allow camera access. Your live face appears on the 3D tablet too.
3. Choose **Who is at the tablet?**, click **Scan face**, and **blink** when asked.
4. Granted → green tick, turnstile arms turn, walk through. Denied → turnstile stays locked;
   try **Use phone app** or **Call reception**.

**Account status (demo control):** in *Member account*, switch between **Eligible**,
**Payment reminder** (allowed in with a notice), **Missed payment** (access paused) and **Expired**,
then scan again.

No webcam? The guided demo (or **Continue without camera**) uses clearly labelled simulated detection.

## Project tour: what each file does

| File | Role |
|---|---|
| `index.html` | The single HTML page. React fills `<div id="root">`. |
| `src/main.tsx` | Entry point: mounts `<App />` into the page. |
| `src/App.tsx` | Connects camera → decision logic → 3D world, and lays out the dashboard. |
| `src/types.ts` | TypeScript shapes for members, steps, gate states and log entries. |
| `src/data/members.ts` | Synthetic members + the 4 demo scenarios. |
| `src/logic/verification.ts` | Pure rules: match threshold, membership check. Easy to unit-test. |
| `src/lib/mediapipe.ts` | Loads the MediaPipe runtime + model (local first, online fallback). |
| `src/hooks/useFaceTracking.ts` | Webcam, per-frame landmark detection, mesh drawing, blink counting. |
| `src/hooks/useAccessController.ts` | Runs the 4-step pipeline, drives the gate, writes the log. |
| `src/components/*` | Dashboard panels (camera, pipeline, gate, membership, log). |
| `src/scene/GymScene.tsx` | The `<Canvas>`: lights, follow camera, player logic. |
| `src/scene/Character.tsx` | The member you control: keyboard/guided-demo movement, collisions. |
| `src/scene/Humanoid.tsx` | Reusable human figure (limbs, walking pose, gym bag, laptop bag). |
| `src/scene/People.tsx` | Other gym-goers and the receptionist. |
| `src/scene/Labels.tsx` | Numbered callouts that explain the scene. |
| `src/scene/Entrance.tsx` | Tripod turnstiles, entrance counter and the FacePass tablet (live video). |
| `src/scene/Building.tsx` | Club facade, revolving door, lobby and gym floor. |
| `src/scene/helpers.ts` | Coordinate system notes, collision boxes, text textures, key tracking. |
| `scripts/setup-mediapipe.mjs` | Runs after `npm install`; puts MediaPipe files in `public/` for offline use. |

Suggested reading order: `types.ts` → `members.ts` → `verification.ts` → `useAccessController.ts`
→ `useFaceTracking.ts` → `App.tsx` → `scene/helpers.ts` → `Character.tsx`.

## Four different questions (say this to the manager)

| Stage | Question | In this prototype |
|---|---|---|
| Detection | Is there a face? | **Real** (MediaPipe, 478 landmarks) |
| Liveness | Is it a live person, not a photo? | **Demo cue only** (blink). Not secure. |
| Recognition | Who is it? | **Simulated** (chosen scenario) |
| Authorisation | May they enter now? | **Mock** membership database |

Landmarks describe the shape and position of a face. They do not identify anyone.

## Privacy & POPIA notes (South Africa)

Facial templates used to identify people are **biometric information**, which POPIA treats as
**special personal information** (section 26). Processing it generally requires the person's
explicit consent (s27), and the gym would remain the **responsible party**. Key points for a real rollout:

- **Consent & choice:** enrolment must be opt-in; the phone app stays available to anyone who declines.
- **Purpose & minimality:** use templates only for entry; never keep raw photos/video longer than needed.
- **Security safeguards (s19):** encrypt templates, restrict access, log access, plan for breaches (s22 notification).
- **Retention & deletion:** delete a member's template when they withdraw consent or leave.
- **Transparency:** notices at the entrance; members can access and correct their data.
- **Operators:** any vendor processing data needs a written contract (s20–21).
- **Prior authorisation:** check with the Information Regulator / a legal adviser whether it applies.

This prototype stores no faces: frames are processed in the browser and discarded every frame.
This is not legal advice.

## Monday demo script (about 5 minutes)

1. **▶ Guided demo** with Thandi (Eligible): door → tablet → green tick → turnstile → gym floor.
2. Set Thandi to **Payment reminder** → guided demo again: she gets in, with a friendly notice.
3. Set Thandi to **Missed payment** → guided demo: access paused, turnstile stays locked,
   reason shown on the tablet → **Call reception** shows the human fallback.
4. **Unknown visitor** and **Unclear match**: FacePass refuses to guess.
5. Turn on the real camera: the face mesh is real detection; recognition is still simulated.
6. Open "What this prototype does (and does not) prove" and explain next steps:
   real recognition with consenting volunteers, a liveness study, then a pilot lane.

Signage in the 3D scene is a neutral placeholder; the club's own branding would only be
added with the club's permission.
