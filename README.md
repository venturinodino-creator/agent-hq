# Agent HQ

A live overview of your repos and the agents working in them. It needs no personal token.

## How it works without a token
A GitHub Action in this repo runs every hour. It uses GitHub's built-in credentials, which every Action gets automatically, to collect commits and workflow runs from your public repos. It saves them to `data.json`. The page reads that one file, so it makes no GitHub API calls and never hits the rate limit.

## One-time setup (about 5 minutes)
1. Create a new **public** repo called **`agent-hq`** at github.com/new.
2. Upload the three files, keeping their folders:
   - `index.html`
   - `scripts/snapshot.mjs`
   - `.github/workflows/snapshot.yml`

   Tip: if dragging the `.github` folder doesn't work, use **Add file → Create new file** and type `.github/workflows/snapshot.yml` as the name. Then paste in the contents.
3. Open the **Actions** tab, then **Agent HQ snapshot**, then **Run workflow**. `data.json` appears within a minute.
   - If it fails with a permission error, go to **Settings → Actions → General → Workflow permissions**, choose **Read and write**, and save.
4. Open the dashboard:
   - **Online:** go to **Settings → Pages**, choose **Deploy from branch → main / root**, and save. The dashboard will be at https://venturinodino-creator.github.io/agent-hq/
   - **Locally:** double-click `index.html`. It still reads the hourly snapshot from GitHub.

## Choosing which repos appear (admin page)
Open `/admin.html` on the dashboard's site (it is not linked from the dashboard), sign in, and switch each repo ON or OFF.
A repo that is OFF is left out of `data.json` entirely, so the dashboard never receives it. New repos start OFF.
Changes apply at the next hourly snapshot; **Run workflow** applies them right away.

- **Login:** the email and password of the account you use in the Supabase project *Energy Lead Dashboard*. Only that one account (pinned by user id) can read or change the list; everyone else gets nothing.
- **Where the list lives:** table `agent_hq_repo_visibility` in that project. The snapshot reads the ON names through the function `agent_hq_visible_repos()` using the project's public key (`supabase.json`), so no secret is stored in this repo.
- **If the list can't be read,** the snapshot stops and keeps the previous `data.json` rather than publishing every repo.
- **Limit:** this controls what the dashboard publishes. The repos themselves stay public on GitHub, and older snapshots in this repo's git history still list every repo name.

## Notes
- The dashboard updates every hour. **Run workflow** refreshes it right away.
- Repos with no activity in the last 60 days are listed, but their details aren't fetched.
- An agent is a workflow that runs on a schedule or is started by hand. CI, smoke checks and the Pages deploy still count toward a repo's health, but aren't listed as agents.
- Cowork tasks aren't visible to GitHub. To show one, add it to `localAgents` at the top of `index.html`.
- Private repos aren't included, because the built-in credentials can only see public ones.
