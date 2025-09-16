import { scanAllServers, sudo } from './helpers.js'

let options;
const argsSchema = [
	['target', 'self'],
	['script', 'bot-commander.js'],
	['threadCount', 1]
];

export function autocomplete(data, args) {
	data.flags(argsSchema);
	const lastFlag = args.length > 1 ? args[args.length - 2] : null;
	if (["--target"].includes(lastFlag))
		return data.servers;
	if (["--script"].includes(lastFlag))
		return data.scripts;
	return [];
}

/** @param {NS} ns */
export async function main(ns) {
	options = ns.flags(argsSchema);
	let target = options.target;
	const script = options.script;
	const scriptRAM = ns.getScriptRam(script);

	const UPDATE_TARGET_FLAG = '/Temp/update-target.txt';
	const EXTRA_TARGETS = '/Temp/extra-targets.txt';
	// Clear out the extra targets file at the start of each run
	ns.write(EXTRA_TARGETS, '', 'w');

	ns.disableLog('scan');
	ns.clearLog();

	if (!ns.scriptRunning('custom-stats.js', 'home'))
		ns.run('./custom-stats.js');

	let serverNames = [""]; // Provide a type hint to the IDE
	serverNames = scanAllServers(ns);
	let servers = serverNames.map(ns.getServer);
	servers = servers.filter(s => s.maxRam > 0 && !s.purchasedByPlayer);
	await ns.run('./get-best-target.js');
	const bestTargets = JSON.parse(ns.read('/Temp/get-best-target.txt'));

	for (const server of servers) {
		const hostName = server.hostname;
		let serverTarget = target; // Use a local variable
		let player = ns.getPlayer();

		if (target == 'self') {
			//ns.tprint(`Server: ${hostName} has ${server.moneyMax}`);
			if (server.moneyMax > 0 && server.hackDifficulty <= player.skills.hacking) {
				serverTarget = hostName;
			} else {
				serverTarget = bestTargets[0].hostname;
			}
		}

		if (hostName !== 'home')
			ns.scp(script, hostName, 'home');
		if (ns.scriptRunning(script, hostName)) {
			const currentTarget = ns.read(UPDATE_TARGET_FLAG, hostName);
			if (currentTarget !== serverTarget) {
				ns.write(UPDATE_TARGET_FLAG, serverTarget, 'w');
				if (hostName !== 'home') {
					ns.scp(UPDATE_TARGET_FLAG, hostName, 'home');
					ns.rm(UPDATE_TARGET_FLAG, 'home');
				}
				ns.tprint(`${hostName} queued up to target '${serverTarget}' next.`);
			}
			continue;
		}

		if (!server.purchasedByPlayer) {
			server.hasAdminRights = sudo(ns, hostName);
		}

		if (server.maxRam < scriptRAM + 1.75) {
			ns.tprint(`Not enough RAM on server to run bots... (${hostName}, ${ns.formatRam(server.maxRam)} / ${ns.formatRam(scriptRAM + 1.75)})`);
			if (server.moneyMax > 0) {
				ns.tprint(`ADD TO EXTRA ACTION LIST (${hostName})`);
				ns.print(`ADD TO EXTRA ACTION LIST (${hostName})`);
				// Append hostname to extra-targets file
				ns.write(EXTRA_TARGETS, hostName + '\n', 'a');
			}
			continue;
		}

		if (server.hasAdminRights) {
			let threadCount = options.threadCount;
			if (threadCount > 0)
				ns.exec(script, hostName, threadCount, '--target', serverTarget, '--hostRAM', server.maxRam);
		}

		await ns.sleep(2_000);
	}

	// work with purchased servers
	servers = serverNames.map(ns.getServer);
	servers = servers.filter(s => s.purchasedByPlayer && s.hostname !== 'home');
	if (servers.length === 0) return;

	const extraTargets = ns.read(EXTRA_TARGETS)
		.split('\n')
		.filter(t => t.trim().length > 0);
	let extraIndex = 0;
	for (const server of servers) {
		const hostName = server.hostname;
		let serverTarget;
		if (extraIndex < extraTargets.length) {
			serverTarget = extraTargets[extraIndex];
			extraIndex++;
		} else {
			serverTarget = bestTargets[0].hostname;
		}

		ns.scp(script, hostName, 'home');
		if (ns.scriptRunning(script, hostName)) {
			const currentTarget = ns.read(UPDATE_TARGET_FLAG, hostName);
			if (currentTarget !== serverTarget) {
				ns.write(UPDATE_TARGET_FLAG, serverTarget, 'w');
				ns.scp(UPDATE_TARGET_FLAG, hostName, 'home');
				ns.rm(UPDATE_TARGET_FLAG, 'home');

				ns.tprint(`${hostName} queued up to target '${serverTarget}' next.`);
			}
			continue;
		}

		if (server.maxRam < scriptRAM + 1.75) {
			ns.tprint(`Not enough RAM on server to run bots... (${hostName}, ${ns.formatRam(server.maxRam)} / ${ns.formatRam(scriptRAM + 1.75)})`);
			continue;
		}

		let threadCount = options.threadCount;
		if (threadCount > 0)
			ns.exec(script, hostName, threadCount, '--target', serverTarget, '--hostRAM', server.maxRam);

		await ns.sleep(2_000);
	}
	try { ns.rm(EXTRA_TARGETS, 'home'); } catch { }
}