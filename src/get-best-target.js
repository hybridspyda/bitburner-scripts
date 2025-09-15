import { scanAllServers } from './helpers.js'

/** @param {NS} ns */
export async function main(ns) {
	ns.disableLog('scan');
	ns.clearLog();

	let serverNames = [""]; // Provide a type hint to the IDE
	serverNames = scanAllServers(ns);

	var player = ns.getPlayer();
	ns.tprint(`1/2 Hacking Level: ${player.skills.hacking / 2}`);

	let servers = serverNames.map(ns.getServer);
	// As a rule of thumb, your hacking target should be the Server with highest max money that's required hacking level is under 1/2 of your hacking level.
	servers = servers.filter(server => !server.purchasedByPlayer && (server.moneyMax || 0) > 0 &&
		(server.requiredHackingSkill < player.skills.hacking / 2));
	
	const bestTarget = servers.sort((a, b) => b.moneyMax - a.moneyMax)[0];
	ns.tprint(`🎯 ${bestTarget.hostname} (access: ${bestTarget.hasAdminRights})`);
	ns.write('/Temp/get-best-target.txt', JSON.stringify(servers.map(s => ({
		hostname: s.hostname,
		moneyMax: s.moneyMax,
		hasAdminRights: s.hasAdminRights,
		hackDifficulty: s.hackDifficulty,
	}))), 'w');
}