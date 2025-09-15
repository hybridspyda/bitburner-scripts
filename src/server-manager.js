let options;
const argsSchema = [
	['RAM', 8],
	['script', 'bot-commander.js'],
	['target', 'n00dles']
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
	const TARGET = options.target;
	const SCRIPT = options.script;
	const RAM = options.RAM;

	// Iterator we'll use for our loop
	let i = 0;

	// Continuously try to purchase servers until we've reached the maximum
	// amount of servers
	while (i < ns.getPurchasedServerLimit()) {
		let hostname = "pserv-" + i;
		let sExist = ns.serverExists(hostname);
		let sMaxRam = sExist ? ns.getServerMaxRam(hostname) : 0;
		if (sExist) {
			let alreadyPurchased = sExist && sMaxRam == RAM;
			if (alreadyPurchased) {
				ns.tprint(`✅ Server: ${hostname}, already at target RAM: ${ns.formatRam(RAM, 0)}, skipping...`);
				++i;
				continue;
			}
		}

		// Check if we have enough money to purchase a server
		if (ns.getServerMoneyAvailable("home") > ns.getPurchasedServerCost(RAM) && (sMaxRam < RAM)) {
			if (sExist) {
				ns.killall(hostname);
				ns.deleteServer(hostname);
				ns.tprint(`🆙 Upgrading Server: ${hostname}`);
			}
			ns.purchaseServer(hostname, RAM);
			ns.scp(SCRIPT, hostname, 'home');
			ns.exec(SCRIPT, hostname, 1, '--target', TARGET, '--hostRAM', RAM);
			++i;
		}
		//Make the script wait for a second before looping again.
		//Removing this line will cause an infinite loop and crash the game.
		await ns.sleep(60_000);
	}
}