import HackableBaseServer from "/if/server.hackable.js"
import BasePlayer from "/if/player.js";
import { dpList } from "/lib/utils.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	ns.clearLog();

	let player = new BasePlayer(ns, "player");

	let servers = [];
	let slist = dpList(ns);
	for (let s of slist) {
		servers.push(new HackableBaseServer(ns, s))
	}

	while (true) {
		for (let server of servers) {
			if (server.purchased || server.isHome) {
				continue;
			}
			let unlocked = false;
			let serverInfoGiven = false;
			// Gain admin on all servers that we can
			if (!server.admin && server.ports.required <= player.ports) {
				server.sudo();
				if (server.admin) {
					unlocked = true;
				}
			}
			
			if (server.money.max != 0) {
				let securityRating = (server.security.level - server.security.min).toFixed(2);
				let saturation = (server.money.available / server.money.max * 100).toFixed(2);
				let moneymax = ns.nFormat(server.money.max, "$0.000a");
				let variant = "ERROR";
				let icon = "☠️";
				if (saturation != 100.00 && securityRating < 2) {
					variant = "SUCCESS";
					icon = "🌱";
				} else if (saturation == 100 && securityRating < 1) {
					variant = "INFO";
					icon = "💵";
				}
				
				ns.print(
					`${variant}\t${
						!server.admin ? " 🔒" : unlocked ? " 🔑" : "   "
					}${	!server.backdoored ? "🚪" : "  "
					}(${securityRating}) [${saturation}% of ${moneymax}] \t${icon} @ ${server.id}`
				);
				serverInfoGiven = true;
			}

			if (!serverInfoGiven) {
				//ns.print(`Server: ${server.id}`);
				await ns.sleep(1);
			} else {
				await ns.sleep(1000);
			}
		}
	}
}