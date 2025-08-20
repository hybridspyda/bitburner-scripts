import HackableBaseServer from "/if/server.hackable.js"
import BasePlayer from "/if/player.js";
import { scriptRunWithDelay, scriptContractor } from "/var/constants.js";
import { dpList } from "/lib/utils.js";
import { formatMoney} from './helpers.js'

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
					ns.toast(`🔑🔓 ${server.id} now unlocked.`);
				}
			}

			let contracts = ns.ls(server.id, ".cct"); // Find out whether there are any contracts on the server
			if (contracts[0]) {
				ns.toast(`📜 Contract found on ${server.id}...`, "info");
				ns.run(scriptRunWithDelay, 1, scriptContractor, 5000);
			}

			let shouldBackdoor = !server.backdoored && server.level <= player.hacking.level;
			if (shouldBackdoor && server.admin) {
				ns.toast(`🚪 Backdoor able to be installed on ${server.id} (${server.level})!`, "info");
			}

			if (server.money.max != 0) {
				let securityRating = (server.security.level - server.security.min).toFixed(2);
				let saturation = ns.formatPercent(server.money.available / server.money.max);
				let moneymax = formatMoney(server.money.max);
				let variant = "ERROR";
				let icon = "☠️";
				if (saturation != 100.00 && securityRating < 2) {
					variant = "SUCCESS";
					icon = "🌱";
				} else if (saturation == 100 && securityRating < 1) {
					variant = "INFO";
					icon = "🤑";
				}

				let msg = `(${securityRating}) `+((server.moneyMax ?? 0 > 0 ? `${formatMoney(server.moneyAvailable ?? 0, 4, 1).padStart(7)} / ` : '') +
					`${formatMoney(server.moneyMax ?? 0, 4, 1).padStart(7)} `).padEnd(18)+` [${saturation} of ${moneymax}]`;
				ns.print(
					`${variant}\t${contracts[0] ? "📜" : "  "
					}${!server.admin ? " 🔒" : unlocked ? " 🔑" : "   "
					}${!server.backdoored ? "🚪" : "  "
					}${msg}${msg.length <= 28 ? "\t " : " "}${icon} @ ${server.id}`
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