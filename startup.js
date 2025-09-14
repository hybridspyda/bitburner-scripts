import { scanAllServers } from './helpers.js'

let options;
const argsSchema = [
	['target', 'n00dles'],
	['script', 'early-hack-template.js']
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

	ns.disableLog('scan');
	ns.clearLog();
	
	let serverNames = [""]; // Provide a type hint to the IDE
	serverNames = scanAllServers(ns);
	let servers = serverNames.map(ns.getServer);
	servers = servers.filter(s => s.maxRam > 0);

	for (const server of servers) {
		const hostName = server.hostname;

		ns.scp(script, hostName, 'home');
		if (ns.scriptRunning(script, hostName)) {
			//ns.scriptKill(script, hostName);
			ns.write('/Temp/update-target.txt', target, 'w');
			ns.tprint(`${hostName} queued up to target '${target}' next.`);
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

		if (server.hasAdminRights) {
			let optimalThreadCount = 1;
			if (hostName == 'home')
				optimalThreadCount = Math.floor((server.maxRam / 2) / ns.getScriptRam(script, 'home'));
			else
				optimalThreadCount = Math.floor(server.maxRam / ns.getScriptRam(script, 'home'));

			ns.exec(script, hostName, optimalThreadCount, '--target', target, '--threadCount', optimalThreadCount);
		}
	}
}