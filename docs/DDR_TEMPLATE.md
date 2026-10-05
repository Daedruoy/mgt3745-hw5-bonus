# DDR-003: Cloud Run dashboard service (5C bonus)

## Task
Write a small Express service that fetches GET /entries from my live Cloudflare Worker, counts pending and completed updates per initiative, and renders a read-only HTML dashboard, deployed to Cloud Run from source. Files delegated: dashboard/server.js and dashboard/package.json. The service never writes to the Worker. This bonus has no FEATURES.md rows; the claims it had to meet are in ADR-003.

## Tool and model
Claude (Anthropic), Sonnet 5.5, in claude.ai, 2026-10-05. Claude also ran two web searches, one on Cloud Run billing requirements and one on the storage permission error, and I used the results to decide what to do.

## Economic rationale
| | Hours 4 |
|---|---|
| Build by hand, at your HW3/HW4 pace | 9 |
| Tool run | 1 hour |
| Review and fixes | 3 |
| **Net** | 5 |

Total time on the bonus was about 4 hours, and most of it went to Google Cloud setup, a failed first deploy, and verification, not the app code.

## Trust Boundary
- What crossed: ADR-003 context, the Worker URL, and live /entries output (chair names, positions, update titles, status, all test data) went into the Claude conversation. Dashboard source went to Google Cloud Build, and the built image sits in Artifact Registry in us-east1, on trial billing credit. I am accountable for both.
- Reverse crossing: the app added the express package and its transitive dependencies, which I did not audit. Deploying also forced a permission change: the default Compute Engine service account had no roles, so I granted it roles/cloudbuild.builds.builder at project level, and get-iam-policy confirmed that is the only role it holds. The dashboard URL is public and shows only initiative names and counts.

## Verification performed
- By hand: compared the dashboard to the Worker's raw /entries output. Both gave 14 updates, 3 completed (21%). General Events: 11 total, 2 completed. Brotherhood: 3 total, 1 completed.
- By hand: POSTed an update with initiative `<b>x</b>`. The dashboard showed the literal text, not bold, so esc() works on the one user-controlled value the page prints. I deleted the test row from D1 afterward and rechecked the count.
- By hand: git log shows ADR-003 (d5bcbca) older than the dashboard commit (f21a3f3).
- By hand: listed the service account's roles to confirm what I had changed.
- No eval files. I wrote no automated test for this service.
- Screenshots in docs/: dashboard final.png, dashboard testing.png, console page.png.

## Findings
- EARS rows passing: not applicable. ADR-003 claims verified: 3 of 3 (service deployed and reads from the live Worker, renders an HTML dashboard, never writes to the Worker).
- Failures and what you changed: the first deploy failed because the default Compute Engine service account was denied access to my uploaded source. Fix: one project-level role, roles/cloudbuild.builds.builder.
- Could not fully verify:
  - The dashboard and my hand count both read the same Worker output, so I checked the arithmetic, not whether the underlying data is right.
  - I did not read the transitive dependencies Cloud Build pulled in.
  - I confirmed that us-east1 is a free-tier region only from a 2025 article, not Google's current pricing page. Actual charges after the deploy date: $0.
  - The Worker does not restrict the initiative field to my five options, so an unknown value appears as its own dashboard row. I did not change this.

## Vibe coding modes
I was in responsible mode, not pure vibe coding. I did not accept the first deploy output and move on. I intervened four times: I checked whether enabling services conflicted with the assignment's rules before agreeing, I confirmed the commit order before deploying, I hand-counted the data and compared it to the dashboard, and I ran my own escape test and then cleaned up the row it created. The Module 5 eval loop would have caught two things I skipped. I wrote no prediction stake, so I never said beforehand whether I expected the first deploy to work, and it did not. I also wrote no automated test, so my hand count was a one-time check. A small node:test file on summarize() and esc() would have made it repeatable.