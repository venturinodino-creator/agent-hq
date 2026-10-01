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

## Notes
- The dashboard updates every hour. **Run workflow** refreshes it right away.
- Repos with no activity in the last 60 days are listed, but their details aren't fetched.
- Your Cowork tasks (tender scraper, job watcher…) aren't visible to GitHub. Edit `localAgents` at the top of `index.html` to add or change them.
- Private repos aren't included, because the built-in credentials can only see public ones.
