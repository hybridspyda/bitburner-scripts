import { sudo } from './helpers'

let options;
const argsSchema = [
	['script', 'bot-commander.js'],
	['target', 'n00dles'],
	['threadCount', 1]
];

export function autocomplete(data, args) {
	data.flags(argsSchema);
	const lastFlag = args.length > 1 ? args[args.length - 2] : null;
	if (["--script"].includes(lastFlag))
		return data.scripts;
	if (["--target"].includes(lastFlag))
		return data.servers;
	return [];
}

/** @param {NS} ns */
export async function main(ns) {
	options = ns.flags(argsSchema);
	const script = options.script;
	const target = options.target;

	ns.scp(script, target, 'home');

	sudo(ns, target);

	ns.exec(script, target, options.threadCount, '--target', target, '--threadCount', options.threadCount);
	ns.tprint(`Script: '${script}' now running on ${target} with ${options.threadCount} thread(s).`);
}