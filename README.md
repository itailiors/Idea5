# Idea5 💡

An offline-first, mobile-first PWA for a daily **5-minute idea ritual**: a countdown timer that never interrupts you, a Markdown notepad, voice notes, streaks, history search, backup/restore and a calendar reminder. Everything is stored on-device in IndexedDB. There is no backend and no account.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (timer, streaks, dates, DB logic, backup zip, .ics, share)
npm run build      # typecheck + production build → dist/
npm run preview    # serve the production build locally (tests the service worker)
```

To try it on your phone over Wi-Fi, run `npm run dev -- --host`. Note that browsers only allow microphone access on **HTTPS** or `localhost`, so voice recording on a phone needs a deployed (HTTPS) build or a tunnel such as `npx localtunnel --port 5173`.

## Deploy

**Vercel**

```bash
npm i -g vercel
vercel          # preview deployment
vercel --prod   # production
```

**Netlify**

```bash
npm i -g netlify-cli
netlify deploy --build          # draft URL
netlify deploy --build --prod   # production
```

You can also connect the Git repository in either dashboard. `vercel.json` and `netlify.toml` already set the build command, the `dist` output folder and a no-cache header for `sw.js`.

## How it works

| Topic | Behaviour |
|---|---|
| **Timer** | `src/lib/timer.ts` is a pure model of `accumulatedMs + (performance.now() − runningSince)`. Nothing is decremented, so it doesn't drift and survives throttled background tabs. At 00:00 the ring glows and the phone vibrates; inputs are never locked and nothing auto-submits. After that it counts overtime (`+01:12`). **+30s** extends the countdown; pressed during overtime, it restarts a 30-second countdown. |
| **One entry per day** | Each Save upserts that day's entry, adds the session's active time to `durationSec`, attaches pending voice clips and resets the timer. Saving again later the same day updates the entry. |
| **Drafts** | Text autosaves (400 ms debounce, flushed on tab hide). Timer time is persisted every 5 s. If you forget to press Save, the draft is archived into that day's entry the next time you open the app, so work is never lost. |
| **Voice notes** | `MediaRecorder` with MIME detection (`audio/webm` on Chrome/Android, `audio/mp4` on Safari/iOS). Clips are stored as Blobs in the `clips` table and stay "pending" (`entryId = 0`) until Save. |
| **Tags** | `#hashtags` in the text are extracted automatically. History search matches text and tags; a query starting with `#` searches tags only. |
| **Streaks** | Always computed from entry dates using **local** calendar days, never stored. A streak stays alive if the last entry was today or yesterday. |
| **Backup** | `.zip` file containing `manifest.json` plus `audio/<id>.<ext>`. Import **replaces** all local data after a confirmation. |
| **Reminder** | Downloads an `.ics` file with `RRULE:FREQ=DAILY` and an alarm. Opening it on a phone adds it to the calendar. |
| **Sharing** | Uses `navigator.share()` where available (it also attaches audio files when the platform allows). Otherwise it opens `https://wa.me/?text=…`. A direct WhatsApp button is always shown. |

## Project structure

```
src/
  main.tsx, App.tsx, index.css
  context/SessionContext.tsx   session day + timer (lives above tabs, so the timer keeps running)
  hooks/useStats.ts            live streak / totals from Dexie
  lib/
    db.ts        Dexie schema (entries, clips, drafts) + saveDay / recoverStaleDrafts / …
    timer.ts     pure timestamp-driven timer
    streak.ts    current + longest streak
    dates.ts     local YYYY-MM-DD helpers & formatting
    backup.ts    fflate zip export/import
    ics.ts       daily reminder calendar file
    share.ts     Web Share API + WhatsApp fallback
    audio.ts     MediaRecorder MIME detection
    markdown.ts  marked + DOMPurify
    tags.ts, prompts.ts, browser.ts
  components/    BottomNav, StreakBadge, Sheet, ClipPlayer, MarkdownView, ShareButtons, Celebration
  features/
    today/       TodayTab, TimerPanel, SparkCard, NoteEditor, AudioRecorder
    history/     HistoryTab, EntryDetail
    stats/       StatsTab (metrics, backup, reminder), Heatmap
```

## Notes

- The app calls `navigator.storage.persist()` so the browser is less likely to evict data. Installing it to the home screen helps too. Export backups regularly anyway.
- The PWA icon is an SVG. Some older iOS versions prefer PNG touch icons; add `public/icon-192.png` and `public/icon-512.png` and list them in `vite.config.ts` if you need them.
