function buildManifest(baseManifest, analyzeApiUrl) {
  let apiUrl;
  try {
    apiUrl = new URL(analyzeApiUrl);
  } catch {
    throw new Error('ANALYZE_API_URL must be a valid HTTP(S) URL');
  }
  if (!['http:', 'https:'].includes(apiUrl.protocol)) {
    throw new Error('ANALYZE_API_URL must be a valid HTTP(S) URL');
  }

  const manifest = JSON.parse(JSON.stringify(baseManifest));
  delete manifest.content_scripts;
  const pageHosts = Array.isArray(manifest.host_permissions)
    ? manifest.host_permissions
    : [];
  manifest.host_permissions = [
    ...new Set([...pageHosts, `${apiUrl.origin}/*`]),
  ];
  return manifest;
}

module.exports = { buildManifest };
