# GE 1102 Online Midterm – Netlify deployment

Students open the site, type their personal access code + details, and take the exam. No sign-in. Questions, answer key, grading and the timer all live on the server (Netlify Function + Netlify Blobs).

## Deploy (choose ONE route)

### Route A – GitHub (easiest, no command line tools)
1. Create a **private** GitHub repository and upload everything in this folder (keep the folder structure).
2. Netlify → Add new site → Import an existing project → pick the repo. Build settings are read from netlify.toml. Deploy.
3. Site configuration → Environment variables → add the variables below, then Deploys → Trigger deploy → Deploy site.

### Route B – Netlify CLI
```
npm install -g netlify-cli
cd uts-exam-netlify
npm install
netlify login
netlify init            # create & link a new site
netlify env:set ADMIN_PASSWORD "choose-a-strong-password"
netlify deploy --prod
```

(Plain drag-and-drop of the folder is NOT recommended: it does not install the @netlify/blobs dependency.)

## Environment variables
| Name | Required | Meaning |
|---|---|---|
| ADMIN_PASSWORD | yes | Password for /admin.html |
| MINUTES | no | Time limit, default 60 |
| MAX_STRIKES | no | Strikes before auto-submit, default 3 |
| OPENS / CLOSES | no | Window for STARTING the exam, ISO format with timezone, e.g. 2026-10-12T08:00:00+08:00 |

Redeploy after changing a variable.

## Using it
- Student page: https://YOUR-SITE.netlify.app/
- Instructor page: https://YOUR-SITE.netlify.app/admin.html (scores, strikes, logs, Reset, CSV export)
- Give each student ONE code from UTS_access_codes_ROSTER.csv (fill in the name column). A code can only be used for one attempt; Reset in the admin page lets a student retake.
- **Test first**: take the exam yourself with one code, check it in /admin.html, then press Reset for that code.
- Keep codes.mjs, bank.mjs and the roster private. Never put them in a public repo.
