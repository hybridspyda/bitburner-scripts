import { scanAllServers } from './helpers.js'

/** @param {NS} ns **/
export async function main(ns) {
	ns.ui.openTail();
	ns.disableLog("ALL");
	ns.clearLog();

	let serverNames = [""]; // Provide a type hint to the IDE
	while (true) {
		serverNames = scanAllServers(ns);
		let servers = serverNames.map(ns.getServer);

		for (let server of servers) {
			let player = ns.getPlayer();
			if (server.purchasedByPlayer) continue;

			let unlocked = false;
			let serverInfoGiven = false;
			// Gain admin on all servers that we can
			if (!server.hasAdminRights) {
				try { ns.brutessh(server.hostName); } catch { }
				try { ns.ftpcrack(server.hostName); } catch { }
				try { ns.relaysmtp(server.hostName); } catch { }
				try { ns.httpworm(server.hostName); } catch { }
				try { ns.sqlinject(server.hostName); } catch { }
				try { ns.nuke(server.hostName); } catch { }

				// Refresh server object to see if we now have admin rights
				server = ns.getServer(server.hostname);

				if (server.hasAdminRights) {
					unlocked = true;
					ns.toast(`🔑🔓 ${server.hostname} now unlocked.`);
				}
			}

			let contracts = ns.ls(server.hostname, ".cct"); // Find out whether there are any contracts on the server
			if (contracts.length > 0) {
				ns.toast(`📜 Contract found on ${server.hostname}...`, "info");
				// run contract unlocking?
			}

			if (!server.backdoorInstalled && server.requiredHackingSkill <= player.skills.hacking && server.hasAdminRights) {
				ns.toast(`🚪 Backdoor able to be installed on ${server.hostname} (${server.requiredHackingSkill})!`, "info");
			}

			if (server.moneyMax != 0) {
				let securityRating = (server.hackDifficulty - server.minDifficulty).toFixed(2);
				let saturation = ns.formatPercent(server.moneyAvailable / server.moneyMax);
				let moneymax = ns.formatNumber(server.moneyMax);
				let variant = "ERROR";
				let icon = "☠️";
				if (saturation != 100.00 && securityRating < 2) {
					variant = "SUCCESS";
					icon = "🌱";
				} else if (saturation == 100 && securityRating < 1) {
					variant = "INFO";
					icon = "🤑";
				}

				let msg = `(${securityRating}) [${saturation} of $${moneymax}]`;
				ns.print(
					`${variant}\t${contracts[0] ? "📜" : "  "
					}${!server.hasAdminRights ? " 🔒" : unlocked ? " 🔑" : "   "
					}${!server.backdoorInstalled ? "🚪" : "  "
					}${msg}${msg.length <= 28 ? "\t " : " "}${icon} @ ${server.hostname}`
				);
				serverInfoGiven = true;
			}

			if (!serverInfoGiven) {
				//ns.print(`Server: ${server.hostname}`);
				await ns.sleep(1);
			} else {
				await ns.sleep(1000);
			}
		}
	}
}