/** @param {NS} ns */
export async function main(ns) {
	const target = ns.args[0];
	const script = "early-hack-template.js";

	// Array of all servers that don't need any ports opened
	// to gain root access. These have 16 GB of RAM
	const servers0Port = [
		"foodnstuff",
		"sigma-cosmetics",
		"joesguns",
		"nectar-net",
		"hong-fang-tea",
		"harakiri-sushi"
	];

	// Array of all servers that only need 1 port opened
	// to gain root access. These have 32 GB of RAM
	const servers1Port = [
		"max-hardware",
		"zer0",
		"iron-gym",
		"neo-net"
	];

	// Copy our scripts onto each server that requires 0 ports
	// to gain root access. Then use nuke() to gain admin access and
	// run the scripts.
	for (let i = 0; i < servers0Port.length; ++i) {
		const serv = servers0Port[i];

		if (ns.scriptRunning(script, serv))
			ns.scriptKill(script, serv);
		ns.scp(script, serv);
		ns.nuke(serv);
		ns.exec(script, serv, 6, target);
	}

	// Wait until we acquire the "BruteSSH.exe" program
	while (!ns.fileExists("BruteSSH.exe")) {
		await ns.sleep(60_000);
	}

	// Copy our scripts onto each server that requires 1 port
	// to gain root access. Then use brutessh() and nuke()
	// to gain admin access and run the scripts.
	for (let i = 0; i < servers1Port.length; ++i) {
		const serv = servers1Port[i];

		if (ns.scriptRunning(script, serv))
			ns.scriptKill(script, serv);
		ns.scp(script, serv);
		ns.brutessh(serv);
		ns.nuke(serv);
		ns.exec(script, serv, 12, target);
	}

	for (let i = 0; i < ns.getPurchasedServerLimit(); i++) {
		let hostname = "pserv-" + i;
		if (ns.serverExists(hostname)) {
			if (ns.scriptRunning(script, hostname))
				ns.scriptKill(script, hostname);
			ns.scp(script, hostname);
			ns.exec(script, hostname, 3, target);
		}
	}
}