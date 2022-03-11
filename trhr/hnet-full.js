import BasePlayer from "/trhr/if.player";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	
	let player = new BasePlayer(ns, "player");
	let runtime = ns.args[0];
	if (runtime) {
		runtime *= 1000;
	} else {
		runtime = 100000000;
	}
	
	const getProd = (level, ram, cores) =>
		(level * 1.5) * Math.pow(1.035, ram - 1) * ((cores + 5) / 6);

	let start_time = new Date().valueOf(); // 16347472346

	let time = new Date().valueOf();
	while (time < start_time + runtime) {
		time = new Date().valueOf();

		if (!ns.hacknet.numNodes()) {
			while (player.money < ns.hacknet.getPurchaseNodeCost())  {
				await ns.sleep(1);
			}
			ns.hacknet.purchaseNode();
		}

		let currentNodeStats = [];

		let nodeValue = getProd(10, 1, 1) * player.hnet.multipliers.production;
		let nodeCost = ns.hacknet.getPurchaseNodeCost();

		currentNodeStats.push({
			value: nodeValue,
			cost: nodeCost,
			ratio: nodeValue/nodeCost,
			type: "node"
		});
		
		for (let idx = 0; idx < ns.hacknet.numNodes(); idx++) {
			let {level, ram, cores, production} = ns.hacknet.getNodeStats(idx);
			
			let levelCost = ns.hacknet.getLevelUpgradeCost(idx, 1);
			let ramCost = ns.hacknet.getRamUpgradeCost(idx, 1);
			let coreCost = ns.hacknet.getCoreUpgradeCost(idx, 1);

			let levelValue = getProd(level + 1, ram, cores) *
				player.hnet.multipliers.production - production;
			let ramValue = getProd(level, ram + 1, cores) *
				player.hnet.multipliers.production - production;
			let coreValue = getProd(level, ram, cores + 1) *
				player.hnet.multipliers.production - production;

			currentNodeStats.push({
					value: levelValue,
					cost:  levelCost,
					ratio: levelValue/levelCost,
					index: idx,
					type: "level"
				}, {
					value: ramValue,
					cost:  ramCost,
					ratio: ramValue/ramCost,
					index: idx,
					type: "ram"
				}, {
					value: coreValue,
					cost:  coreCost,
					ratio: coreValue/coreCost,
					index: idx,
					type: "core"
				}
			);			
		}
		
		currentNodeStats.sort((a,b) => b.ratio - a.ratio);
		let bestUpgrade = currentNodeStats[0];

		while (player.money < bestUpgrade.cost) {
			await ns.sleep(10000); // wait 10s
		}

		function toReadableMoney(cost) {
			return cost.toLocaleString("en-US", { style: "currency", currency: "USD" });
		}

		const dollars = toReadableMoney(bestUpgrade.cost);
		switch(bestUpgrade.type) {
			case "level":
				ns.print(`SUCCESS\tnode-${bestUpgrade.index} : UPGRADE_LEVEL\t@ ${dollars}`);
				ns.hacknet.upgradeLevel(bestUpgrade.index, 1);
				break;
			case "ram":
				ns.print(`WARN\tnode-${bestUpgrade.index} : UPGRADE_RAM\t@ ${dollars}`);
				ns.hacknet.upgradeRam(bestUpgrade.index, 1);
				break;
			case "core":
				ns.print(`INFO\tnode-${bestUpgrade.index} : UPGRADE_CORES\t@ ${dollars}`);
				ns.hacknet.upgradeCore(bestUpgrade.index, 1);
				break;
			case "node":
				ns.print(`ERROR\tnode-new : PURCHASE_NODE\t@ ${dollars}`);
				ns.hacknet.purchaseNode();
				break;
		}

		await ns.sleep(1);
	}

}