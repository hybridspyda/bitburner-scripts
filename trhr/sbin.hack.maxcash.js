/** @param {NS} ns **/
import { homeServer, hackScriptCost, growScriptCost, weakenScriptCost } from "/trhr/var.constants.js";

/**
 * returns an array of servers dynamically
 */
function dpList(ns, current=homeServer, set=new Set()) {
	let connections = ns.scan(current)
	let next = connections.filter(c => !set.has(c))
	next.forEach(n => {
		set.add(n);
		return dpList(ns, n, set)
	})
	return Array.from(set.keys())
}

function threadCount(ns, hostname, scriptRam) {
	let threads = 0;
	let free_ram = ns.getServerMaxRam(hostname) - ns.getServerUsedRam(hostname)

	threads = free_ram / scriptRam
	return Math.floor(threads)
}

export async function main(ns) {
	ns.disableLog("ALL");
	
	let servers = dpList(ns);
	// let target = "foodnstuff"
	for (let server of servers) {
		await ns.scp(["/trhr/bin.wk.js", "/trhr/bin.hk.js", "/trhr/bin.gr.js"], homeServer, server)
	}

	while(true) {
		let targets = dpList(ns).filter(s => ns.getServerMoneyAvailable(s) > 5000 && !ns.getPurchasedServers().includes(s) && s != homeServer);
		for (let server of servers) {
			for (let target of targets) {
				if (ns.hasRootAccess(server) && ns.hasRootAccess(target) && ns.getServerMoneyAvailable(target) > 5000) {
					// divert all of this server's available threads to the most valuable command
					if (ns.getServerSecurityLevel(target) > ns.getServerMinSecurityLevel(target) + 3) {
						let available_threads = threadCount(ns, server, weakenScriptCost)
						// weaken the target while security > minsecurity
						if (available_threads >= 1) {
							ns.exec("/trhr/bin.wk.js", server, available_threads, target)
							ns.print(`ERROR\t☠️ weaken @ ${server} (${available_threads}) -> ${target}`);
						}
					} else {
						let available_threads = threadCount(ns, server, hackScriptCost)

						// hack the target
						if (available_threads >= 1) {
							ns.exec("/trhr/bin.hk.js", server, available_threads, target)
							ns.print(`INFO\t💵 hack @ ${server} (${available_threads}) -> ${target}`);
						}
					}
				}
			}

		await ns.sleep(10)
		}
	}
}