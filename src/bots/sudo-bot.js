/** Helper to unlock a host
 * @param {NS} ns The netscript instance passed to your script's main entry point
 * @param {string} hostname The hostname you wish to attempt to gain admin access to
 * @returns {boolean} Returns if the use of NUKE.exe was successful or not */
export function sudo(ns, hostname) {
  try { ns.brutessh(hostname); } catch { }
  try { ns.ftpcrack(hostname); } catch { }
  try { ns.relaysmtp(hostname); } catch { }
  try { ns.httpworm(hostname); } catch { }
  try { ns.sqlinject(hostname); } catch { }
  try {
    ns.nuke(hostname);
    return true;
  } catch {
    return false;
  }
}