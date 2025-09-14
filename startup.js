import { scanAllServers } from './helpers.js'

let options;
const argsSchema = [
	['target', 'n00dles'],
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
	const target = options.target;
	const script = options.script;
	const scriptRAM = ns.getScriptRam(script);

	const UPDATE_TARGET_FLAG = '/Temp/update-target.txt';

	ns.disableLog('scan');
	ns.clearLog();

	ns.run('./custom-stats.js');

	let serverNames = [""]; // Provide a type hint to the IDE
	serverNames = scanAllServers(ns);
	let servers = serverNames.map(ns.getServer);
	servers = servers.filter(s => s.maxRam > 0);

	for (const server of servers) {
		const hostName = server.hostname;

		if (hostName !== 'home')
			ns.scp(script, hostName, 'home');
		if (ns.scriptRunning(script, hostName)) {
			const currentTarget = ns.read(UPDATE_TARGET_FLAG, hostName);
			if (currentTarget !== target) {
				ns.write(UPDATE_TARGET_FLAG, target, 'w');
				if (hostName !== 'home') {
					ns.scp(UPDATE_TARGET_FLAG, hostName, 'home');
					ns.rm(UPDATE_TARGET_FLAG, 'home');
				}
				ns.tprint(`${hostName} queued up to target '${target}' next.`);
			}
			continue;
		}

		if (!server.purchasedByPlayer) {
			try { ns.brutessh(hostName); } catch { }
			try { ns.ftpcrack(hostName); } catch { }
			try { ns.relaysmtp(hostName); } catch { }
			try { ns.httpworm(hostName); } catch { }
			try { ns.sqlinject(hostName); } catch { }
			try { ns.nuke(hostName); } catch { }
		}

		if (server.maxRam < scriptRAM + 1.75) {
			ns.tprint(`Not enough RAM on server to run bots... (${hostName}, ${ns.formatRam(server.maxRam)} / ${ns.formatRam(scriptRAM + 1.75)})`);
			continue;
		}

		if (server.hasAdminRights) {
			let threadCount = options.threadCount;
			if (threadCount > 0)
				ns.exec(script, hostName, threadCount, '--target', target, '--hostRAM', server.maxRam);
		}

		await ns.sleep(2_000);
	}
}