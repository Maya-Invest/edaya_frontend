export function assertPublishedCandidate(version, metadata, sourceCommit) {
  const match = /^0\.0\.0-(?:staging|production)\.([a-f0-9]{40})$/.exec(version || "");
  if (!match || !/^[a-f0-9]{40}$/.test(sourceCommit || "") || match[1] !== sourceCommit) {
    throw new Error("An exact client version matching the qualified backend commit is required");
  }
  if (metadata?.version !== version || metadata?.edayaSourceCommit !== sourceCommit) {
    throw new Error("Published API client source does not match the qualified backend candidate");
  }
  return `npm:@maya-invest/edaya-api-client@${version}`;
}
