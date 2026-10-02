// Decides which repos the snapshot may publish. Pure: no network, no file access.
// rows come from the private visibility list: [{ name, visible }].
// A repo is hidden unless its row says visible === true, so a repo nobody has switched on never appears.
export function applyVisibility(repos, rows) {
  const on = new Map(rows.map(r => [r.name, r.visible === true]));
  return {
    shown: repos.filter(r => on.get(r.name) === true),
    unknown: repos.filter(r => !on.has(r.name)).map(r => r.name),   // not in the list yet: register as off
  };
}
