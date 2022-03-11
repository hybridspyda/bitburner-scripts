/** @param {NS} ns **/
import { homeServer, hackScriptCost, growScriptCost, weakenScriptCost } from "/trhr/var.constants.js";
import HackableBaseServer from "/trhr/if.server.hackable"
import BasePlayer from "/trhr/if.player";
import { dpList } from "/trhr/lib.utils";

export async function main(ns) {
	ns.disableLog("scan");
	ns.disableLog("sleep");
	
	let sList = dpList(ns);
	let servers = [];
	let player = new BasePlayer(ns, "player");
	await player.updateCache(false);
	for (let s of sList) {
		let server = new HackableBaseServer(ns, s);
		servers.push(server);
	}
	let target = ns.args[0];
	if (ns.args[0]) {
		target = new HackableBaseServer(ns, ns.args[0]);
	} else {
		target = new HackableBaseServer(ns, "foodnstuff");
	}

	while(true) {
		for (let server of servers) {
			try { await server.updateCache(false) } catch {}
			if (server.admin && target.admin) {
				// divert all of this server's available threads to the most valuable command
				if (target.security.level > target.security.min) {
					let available_threads = server.threadCount(weakenScriptCost);
					// weaken the target while security > minsecurity
					if (available_threads >= 1) {
						ns.exec("/trhr/bin.wk.js", server.id, available_threads, target.id);
						ns.print(`ERROR\t☠️ weaken @ ${server.id} (${available_threads}) -> ${target.id}`);
					}
				} else if (target.money.available < target.money.max) {
					let available_threads = server.threadCount(growScriptCost);

					// grow the target while money < maxmoney
					if (available_threads >= 1) {
						ns.exec("/trhr/bin.gr.js", server.id, available_threads, target.id);
						ns.print(`SUCCESS\t🌱 grow @ ${server.id} (${available_threads}) -> ${target.id}`);
					}
				} else {
					let available_threads = server.threadCount(hackScriptCost);

					// hack the target
					if (available_threads >= 1) {
						ns.exec("/trhr/bin.hk.js", server.id, available_threads, target.id);
						ns.print(`INFO\t💵 hack @ ${server.id} (${available_threads}) -> ${target.id}`);
					}
				}
			}

			await ns.sleep(1000);
		}
	}
}