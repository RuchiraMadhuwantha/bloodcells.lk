// The server exposes only the configured main blood bank. Multiple destinations
// indicate an invalid or outdated response; never choose a regional centre.
export const transferDestination=centres=>centres.length===1?centres[0]:null;
