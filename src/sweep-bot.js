import { scanAllServers, sudo } from './helpers.js'

const argsSchema = [
	['autoBackdoor', false],
];

export function autocomplete(data, _) {
	data.flags(argsSchema);
	return [];
}

/** @param {NS} ns **/
export async function main(ns) {
	const options = ns.flags(argsSchema);
	const autoBackdoor = options.autoBackdoor;

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
			let shouldBackdoor = false;
			// Gain admin on all servers that we can
			if (!server.hasAdminRights) {
				if (server.hasAdminRights = sudo(ns, server.hostname)) {
					unlocked = true;
					ns.toast(`🔑🔓 ${server.hostname} now unlocked.`);
				}
			}

			let contracts = ns.ls(server.hostname, ".cct"); // Find out whether there are any contracts on the server
			if (contracts.length > 0) {
				ns.toast(`📜 Contract found on ${server.hostname}...`, "info");
				// run contract unlocking?
			}

			if (!server.backdoorInstalled && server.requiredHackingSkill <= player.skills.hacking && server.hasAdminRights)
				shouldBackdoor = true;

			if (server.moneyMax != 0) {
				const moneyThresh = server.moneyMax * 0.8;
				const securityThresh = server.minDifficulty + 5;

				let securityRating = (server.hackDifficulty - server.minDifficulty).toFixed(2);
				let saturation = ns.formatPercent(server.moneyAvailable / server.moneyMax);
				let moneymax = ns.formatNumber(server.moneyMax);
				let variant = "ERROR";
				let icon = "☠️";
				if (server.hackDifficulty > securityThresh) {
					// weak
				} else if (server.moneyAvailable < moneyThresh) {
					// grow
					variant = "SUCCESS";
					icon = "🌱";
				} else {
					// hack
					variant = "INFO";
					icon = "🤑";
				}

				let msg = `(${securityRating}) [${saturation} of $${moneymax}]`;
				ns.print(
					`${variant}\t${contracts[0] ? "📜" : "  "
					}${!server.hasAdminRights ? " 🔒" : unlocked ? " 🔑" : "   "
					}${shouldBackdoor ? "⛩️" : !server.backdoorInstalled ? "🚪" : "  "
					}${msg}${msg.length <= 28 ? "\t " : " "}${icon} @ ${server.moneyMax == 0 && !server.purchasedByPlayer ? colorize(ns, server.hostname) : server.hostname}`
				);
			} else if (!server.purchasedByPlayer) {
				ns.print(
					`WARNING\t${contracts[0] ? "📜" : "  "
					}${!server.hasAdminRights ? " 🔒" : unlocked ? " 🔑" : "   "
					}${shouldBackdoor ? "⛩️" : !server.backdoorInstalled ? "🚪" : "  "
					}\t\t\t\t\t    @ ${server.hostname}`
				);
			}
			if (autoBackdoor && shouldBackdoor) try {
				await ns.run('./find_server.js', 1, '--target', server.hostname, '--fast', '--backdoor');
				ns.print(`INFO\tPausing while backdooring ${server.hostname}...`);
				while(!server.backdoorInstalled) {
					server.backdoorInstalled = ns.getServer(server.hostname).backdoorInstalled
					await ns.sleep(1_000);
				}
				ns.print(`SUCCESS\tBackdoor for ${server.hostname} now installed!`);
			} catch {
				if (autoBackdoor) {
					ns.print(`ERROR\tBackdoor for ${server.hostname} failed!`);
				}
			}

			await ns.sleep(1_000);
		}
		await ns.sleep(1);
	}
}