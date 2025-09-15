/** Helper to get a list of all hostnames on the network
 * @param {NS} ns The netscript instance passed to your script's main entry point
 * @returns {string[]} discoveredHosts */
export function scanAllServers(ns) {
	let discoveredHosts = []; // Hosts (a.k.a servers) we have scanned
	let hostsToScan = ["home"]; // Hosts we know about, but have not yet scanned
	let infiniteLoopProtection = 9999;
	while (hostsToScan.length > 0 && infiniteLoopProtection-- > 0) { // Loop until the list of hosts to scan is empty
		let hostName = hostsToScan.pop(); // Get the next host to be scanned
		discoveredHosts.push(hostName); // Mark this host as "scanned"
		for (const connectedHost of ns.scan(hostName)) // "scan" (list all hosts connected to this one)
			if (!discoveredHosts.includes(connectedHost) && !hostsToScan.includes(connectedHost)) // If we haven't found this host
				hostsToScan.push(connectedHost); // Add it to the queue of hosts to be scanned
	}
	return discoveredHosts; // The list of scanned hosts should now be the set of all hosts in the game!
}

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