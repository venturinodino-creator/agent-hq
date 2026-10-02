// Decides which repos the snapshot may publish. Pure: no network, no file access.
// `visibleNames` is the list of repo names switched ON in the owner's private list. A repo is shown only if
// its name is on it, so a repo nobody has switched on never appears. Anything that is not a plain list of
// names is refused rather than guessed at: the caller then stops and publishes nothing.
export function applyVisibility(repos, visibleNames) {
  if (!Array.isArray(visibleNames) || !visibleNames.every(n => typeof n === 'string')) {
    throw new Error('visibility: the visible list is not a list of repo names');
  }
  const on = new Set(visibleNames);
  return repos.filter(r => on.has(r.name));
}
