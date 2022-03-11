import { getPotentialTargets } from "./find-targets.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");

	const compareType = ns.args[0];
	const waitTime = 2000;
	const logLimit = 50;

	while (true) {
		ns.clearLog();
		const targets = getPotentialTargets(ns, compareType);
		const printedTargets = targets.length < logLimit
		 ? targets : targets.slice(0, logLimit);
		for (const target of printedTargets) {
			const node = target.node;
			const strategy = target["strategy.type"];
			let variant = "INFO";
			let icon = "💵";
			if (strategy === "flog") {
				variant = "ERROR";
				icon = "☠️";
			} else if (strategy === "nourish") {
				variant = "SUCCESS";
				icon = "🌱";
			}

			let securityRating = (target.security - target.minSecurity).toFixed(2);
			let saturation = (target.curMoney / target.maxMoney * 100).toFixed(2);
			let moneyMax = ns.nFormat(target.maxMoney, "$0.000a");
			//ns.print(`${variant}\t${icon} ${strategy} (${securityRating}) [${saturation}% of ${moneyMax}] @ ${node} (${target.reqHackLevel})`);
			ns.print(`${variant}\t(${securityRating})\t[${saturation}% of ${moneyMax}]\t${icon} @ ${node} (${target.reqHackLevel})`);
		}
		await ns.sleep(waitTime);
	}
}