const argsSchema = [
	['target', ''],
	['fast', false],
	['backdoor', false]
];

export function autocomplete(data, args) {
	data.flags(argsSchema);
	const lastFlag = args.length > 1 ? args[args.length - 2] : null;
	if (["--target"].includes(lastFlag))
		return data.servers;
	return [];
}

function recursiveScan(ns, parent, server, target, route) {
	const children = ns.scan(server);
	for (let child of children) {
		if (parent == child) {
			continue;
		}
		if (child == target) {
			route.unshift(child);
			route.unshift(server);
			return true;
		}

		if (recursiveScan(ns, server, child, target, route)) {
			route.unshift(server);
			return true;
		}
	}
	return false;
}

export async function main(ns) {
	const options = ns.flags(argsSchema);
	const server = options.target;
	if (!server) {
		ns.tprint("This script helps you find a server on the network and shows you the path to get to it.");
		ns.tprint(`Usage: run ${ns.getScriptName()} SERVER`);
		ns.tprint("Example:");
		ns.tprint(`> run ${ns.getScriptName()} n00dles`);
		return;
	}
	const backdoor = options.backdoor;
	const fast = options.fast;
	let route = [];

	recursiveScan(ns, '', 'home', server, route);
	if (!fast) {
		for (const i in route) {
			await ns.sleep(250);
			const extra = i > 0 ? "└ " : "";
			ns.tprint(`${" ".repeat(i)}${extra}${route[i]}`);
		}
	}
	const terminalInput = eval("document.getElementById('terminal-input')");
	terminalInput.value = `${route.join('; connect ')}; ls${backdoor ? '; backdoor' : ''}`;
	const handler = Object.keys(terminalInput)[1];
	terminalInput[handler].onChange({ target: terminalInput });
	terminalInput[handler].onKeyDown({ key: 'Enter', preventDefault: () => null });

	return terminalInput.value;
}