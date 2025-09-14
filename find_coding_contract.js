import { scanAllServers } from './helpers.js'

export function autocomplete(data, _) {
	return data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('scan');
	ns.disableLog('sleep');
	ns.clearLog();

	let serverNames = scanAllServers(ns);
	let foundContracts = [];
	for (let hostname of serverNames) {
		if (ns.ls(hostname).find(f => f.endsWith('.cct')))
			foundContracts.push(hostname);
	}
	ns.print(JSON.stringify(foundContracts));
	if (foundContracts.length == 0) {
		ns.tprint("No coding contracts found.");
		return;
	}

	ns.tprint(`Found coding contract on the following servers: '${foundContracts.join(', ')}'.`)
}