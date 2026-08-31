export function isGitHubPagesPrivacyMode(){
  return location.protocol==='https:' && /(^|\.)github\.io$/i.test(location.hostname);
}
