let options;
const argsSchema = [
	['target', 'n00dles'],
	['hostRAM', 8],
	['HWGWbatch', false]
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
	const hwgwBatch = options.HWGWbatch;
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

		if (hwgwBatch) {
			// time a batch of Hack, Weaken, Grow, Weaken cycle
			/*
				A few things need to be known before this algorithm can be implemented:

				The effects of hack and grow depend on the server security level, a higher security level results in a reduced effect. You only want these effects to occur when the security level is minimized.
				The time taken to execute hack, grow, or weaken is determined when the function is called and is based on the security level of the target server and your hacking level. You only want these effects to start when the security level is minimized.
				The effects of hack, grow, and weaken, are determined when the time is completed, rather than at the beginning. Hack should finish when security is minimum and money is maximum. Grow should finish when security is minimum, shortly after a hack occurred. Weaken should occur when security is not at a minimum due to a hack or grow increasing it.
				A single batch consists of four actions:

				A hack script removes a predefined, precalculated amount of money from the target server.
				A weaken script counters the security increase of the hack script.
				A grow script counters the money decrease caused by the hack script.
				A weaken script counters the security increase caused by the grow script.
				It is also important that these 4 scripts finish in the order specified above, and all of their effects be precalculated to optimize the ratios between them. This is the reason for the delay in the scripts.

													 |= hack ====================|
				|=weaken 1======================================|
											 |= grow ==========================|
				  |=weaken 2======================================|
				
				Batches only function predictably when the target server is at minimum security and maximum money, so your script must also handle preparing a server for your batches. You can utilize batches to prepare a server by using no hack threads during preparation.
			 */
		} else {
			if (ns.getServerSecurityLevel(target) > securityThresh) {
				if (bots.weakBot.threadCount > 0 && !ns.isRunning(bots.weakBot.script, hostName))
					await ns.run(bots.weakBot.script, bots.weakBot.threadCount, target);
			} else if (ns.getServerMoneyAvailable(target) < moneyThresh) {
				if (bots.growBot.threadCount > 0 && !ns.isRunning(bots.growBot.script, hostName))
					await ns.run(bots.growBot.script, bots.growBot.threadCount, target);
			} else {
				if (bots.hackBot.threadCount > 0 && !ns.isRunning(bots.hackBot.script, hostName))
					await ns.run(bots.hackBot.script, bots.hackBot.threadCount, target);
			}
		}
		await ns.sleep(200);
	}
}