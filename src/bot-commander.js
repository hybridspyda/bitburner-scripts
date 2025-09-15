let options;
const argsSchema = [
	['target', 'n00dles'],
	['hostRAM', 8]
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
	const hostName = ns.getHostname();
	let hostRAM = hostName === 'home' ? options.hostRAM * 0.75 : options.hostRAM;
	const scriptRAM = ns.getScriptRam('/bot-commander.js', hostName);
	ns.tprint(`${hostName} 🚀🤖🎯 ${target}`);
	const UPDATE_TARGET_FLAG = '/Temp/update-target.txt';

	const bots = {
		weakBot: {
			script: '/bots/weak-bot.js',
			cost: 1.75,
			get threadCount() { return Math.floor((hostRAM - scriptRAM) / this.cost); }
		},
		growBot: {
			script: '/bots/grow-bot.js',
			cost: 1.75,
			get threadCount() { return Math.floor((hostRAM - scriptRAM) / this.cost); }
		},
		hackBot: {
			script: '/bots/hack-bot.js',
			cost: 1.7,
			get threadCount() { return Math.floor((hostRAM - scriptRAM) / this.cost); }
		}
	};
	ns.scp([
		bots.weakBot.script,
		bots.growBot.script,
		bots.hackBot.script
	], hostName, 'home');

	const moneyThresh = ns.getServerMaxMoney(target) * 0.8;
	const securityThresh = ns.getServerMinSecurityLevel(target) + 5;

	while (true) {
		let lastRead = ns.read(UPDATE_TARGET_FLAG);
		if (lastRead !== '' && target !== lastRead) {
			target = lastRead;
			ns.tprint(` ${hostName} 🔀🎯 ${target}`);
			ns.rm(UPDATE_TARGET_FLAG, hostName);
			ns.spawn(ns.getScriptName(), { threads: 1, spawnDelay: 250 },
				'--target', target, '--hostRAM', hostRAM);
			return; // stop current loop after spawn
		} else if (target === lastRead) {
			ns.rm(UPDATE_TARGET_FLAG, hostName);
		}

		if (ns.getServerSecurityLevel(target) > securityThresh) {
			if (bots.weakBot.threadCount > 0)
				ns.run(bots.weakBot.script, bots.weakBot.threadCount, target);
		} else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
			if (bots.growBot.threadCount > 0)
				ns.run(bots.growBot.script, bots.growBot.threadCount, target);
		} else {
			if (bots.hackBot.threadCount > 0)
				ns.run(bots.hackBot.script, bots.hackBot.threadCount, target);
		}
		await ns.sleep(200);
	}
}