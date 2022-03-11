import { homeServer } from "/trhr/var.constants.js";
import { pushToInputPort, checkForEvent, createUUID } from "./port-utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	// Port fields
	const uuid = createUUID();
	const reqDuration = 250;
	const maxTicks = 5;
	const port = 18;

	// Auto starter fields
	const autoDeployScript = "auto-deploy.js";
	const autoPurchaseServerScript = "auto-purchase-server.js";
	const monitorScript = "/trhr/usr.monitor.js";
	const apsLiteScript = "aps-lite.js";
	const launchFleetsScript = "captain.js";
	const hNetScript = "/trhr/hnet-full.js";
	const tick = 10000; // 10s
	let curTarget = "n00dles";

	const dataType = {
		targets: "Targets",
	}

	// Services that need to be running before the captain
	// If undefined, no need to pass arguments
	// Each service needs a port number and a delay to use as args
	const dependencies = {
		'queue-service.js': undefined,
		'strategist.js': {
			port: 1,
			delay: 50
		}
	}

	function runDependencies() {
		for (const service of Object.keys(dependencies)) {
			const args = dependencies[service];
			if (!ns.scriptRunning(service, homeServer)) {
				if (args) {
					ns.run(service, 1, args.port, args.delay);
				} else {
					ns.run(service, 1);
				}
			}
		}
	}

	function killDependencies() {
		for (const service of Object.keys(dependencies)) {
			if (ns.scriptRunning(service, homeServer)) {
				ns.scriptKill(service, homeServer);
			}
		}
	}

	async function requestData(type, payload = {}) {
		const reqEvent = `req${type}`;
		const resEvent = `res${type}`;
		pushToInputPort(ns, reqEvent, uuid, payload, port);
		let curTicks = 0;
		while (true) {
			if (curTicks > maxTicks) {
				ns.print("ERROR Request time out for " + type);
				return;
			}
			const event = checkForEvent(ns, resEvent, uuid);
			if (event) {
				return event.data;
			}
			curTicks++;
			await ns.sleep(reqDuration);
		}
	}

	function launchFleetsAndExit() {
		ns.tprint(`WARN Formulas.exe purchased! Swapping to launch-fleets!`);
		killDependencies();
		ns.scriptKill(autoDeployScript, homeServer);
		ns.scriptKill(autoPurchaseServerScript, homeServer);
		ns.scriptKill(monitorScript, homeServer);
		ns.exec(launchFleetsScript, homeServer);
		ns.exec(apsLiteScript, homeServer);
		ns.exec(hNetScript, homeServer);

		try {
			// tail-em
			ns.tail(apsLiteScript, homeServer);
			ns.tail(hNetScript, homeServer);
		} catch {}

		ns.exit();
	}

	async function updateTargetIfApplicable() {
		const targets = await requestData(dataType.targets);
		const newTarget = targets[0].node;
		if (newTarget != curTarget) {
			ns.print(`WARN Swapping targets: ${curTarget} -> ${newTarget}`);
			ns.toast(`WARN Swapping targets: ${curTarget} -> ${newTarget}`);
			ns.scriptKill(autoDeployScript, homeServer);
			ns.scriptKill(autoPurchaseServerScript, homeServer);
			ns.scriptKill(monitorScript, homeServer);
			ns.exec(autoDeployScript, homeServer, 1, newTarget);
			ns.exec(autoPurchaseServerScript, homeServer, 1, newTarget);
			ns.exec(monitorScript, homeServer, 1, newTarget);
			curTarget = newTarget;
		}
	}

	runDependencies();
	
	if (ns.hacknet.numNodes() < 10 && !ns.scriptRunning(hNetScript, homeServer)) {
		ns.exec(hNetScript, homeServer);
	}

	while (true) {
		if (ns.fileExists("Formulas.exe", homeServer)) {
			launchFleetsAndExit();
		} else {
			await updateTargetIfApplicable();
		}

		
		if (ns.hacknet.numNodes() >= 10 &&
			ns.scriptRunning(hNetScript, homeServer) &&
			ns.scriptRunning(autoPurchaseServerScript, homeServer)) {
			ns.scriptKill(hNetScript, homeServer);
		}

		

		await ns.sleep(tick);
	}
}