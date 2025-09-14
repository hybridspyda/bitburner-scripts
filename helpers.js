/** Helper to get a list of all hostnames on the network
 * @param {NS} ns The netscript instance passed to your script.s main entry point
 * @returns {string[]} **/
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
