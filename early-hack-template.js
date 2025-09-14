let options;
const argsSchema = [
	['target', 'n00dles'],
	['threadCount', 1]
];

export function autocomplete(data, args) {
	data.flags(argsSchema);
	const lastFlag = args.length > 1 ? args[args.length - 2] : null;
	if (["--target"].includes(lastFlag))
		return data.servers;
	return [];
}

/** @param {NS} ns */
export async function main(ns) {
	options = ns.flags(argsSchema);
	let target = options.target;
	const threadCount = options.threadCount;
	const hostName = ns.getHostname();
	ns.tprint(`${hostName} 🚀 Launching hack script on target: ${target} (-t ${threadCount})`);

	const moneyThresh = ns.getServerMaxMoney(target) * 0.8;
	const securityThresh = ns.getServerMinSecurityLevel(target) + 5;

	while (true) {
		let lastRead = ns.read('/Temp/update-target.txt');
		if (lastRead !== '' && target !== lastRead) {
			target = lastRead;
			ns.tprint(`🎯 ${hostName} changed to target: ${target}`);
			ns.rm('/Temp/update-target.txt', hostName);
			ns.spawn(ns.getScriptName(), { threads: threadCount, spawnDelay: 500 },
				'target', target, 'threadCount', threadCount);
		} else if (target === lastRead) {
			ns.rm('/Temp/update-target.txt', hostName);
		}
		if (ns.getServerSecurityLevel(target) > securityThresh) {
			await ns.weaken(target);
		} else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
			await ns.grow(target);
		} else {
			await ns.hack(target);
		}
	}
}