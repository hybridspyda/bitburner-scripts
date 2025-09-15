import { scanAllServers } from './helpers.js'

/** @param {NS} ns **/
export async function main(ns) {
	const args = ns.flags([["help", false]]);
	if (args.help) {
		ns.tprint("This script will enhance your HUD (Heads up Display) with custom statistics.");
		ns.tprint(`Usage: run ${ns.getScriptName()}`);
		ns.tprint("Example:");
		ns.tprint(`> run ${ns.getScriptName()}`);
		return;
	}

	ns.disableLog('scan');
	ns.disableLog('sleep');
	ns.clearLog();

	let serverNames = [""]; // Provide a type hint to the IDE
	serverNames = scanAllServers(ns);
	let servers = serverNames.map(ns.getServer);
	const defaultBnOrder = [ // The order in which we intend to play bitnodes
		// 1st Priority: Key new features and/or major stat boosts
		4.3,  // Normal. Need singularity to automate everything, and need the API costs reduced from 16x -> 4x -> 1x reliably do so from the start of each BN
		1.2,  // Easy.   Big boost to all multipliers (16% -> 24%), and no penalties to slow us down. Should go quick.
		5.1,  // Normal. Unlock intelligence stat early to maximize growth, getBitNodeMultipliers + Formulas.exe for more accurate scripts, and +8% hack mults
		1.3,  // Easy.   The last bonus is not as big a jump (24% -> 28%), but it's low-hanging fruit
		2.1,  // Easy.   Unlocks gangs, which reduces the need to grind faction and company rep for getting access to most augmentations, speeding up all BNs

		// 2nd Priority: More new features, from Harder BNs. Things will slow down for a while, but the new features should pay in dividends for all future BNs
		10.1, // Hard.   Unlock Sleeves (which tremendously speed along gangs outside of BN2) and grafting (can speed up slow rep-gain BNs). // TODO: Buying / upgrading sleeve mem has no API, requires manual interaction. Can we automate this with UI clicking like casino.js?
		8.2,  // Hard.   8.1 immediately unlocks stocks, 8.2 doubles stock earning rate with shorts. Stocks are never nerfed in any BN (4S can be made too pricey though), and we have a good pre-4S stock script.
		13.1, // Hard.   Unlock Stanek's Gift. We've put a lot of effort into min/maxing the Tetris, so we should try to get it early, even though it's a hard BN. I might change my mind and push this down if it proves too slow.
		7.1,  // Hard.   Unlocks the bladeburner API (and bladeburner outside of BN 6/7). Many recommend it before BN9 since it ends up being a faster win condition in some of the tougher bitnodes ahead.
		9.1,  // Hard.   Unlocks hacknet servers. Hashes can be earned and spent on cash very early in a tough BN to help kick-start things. Hacknet productin/costs improved by 12%
		14.2, // Hard.   Boosts go.js bonuses, but note that we can automate IPvGO from the very start (BN1.1), no need to unlock it. 14.1 doubles all bonuses. 14.2 unlocks the cheat API.

		// 3nd Priority: With most features unlocked, max out SF levels roughly in the order of greatest boost and/or easiest difficulty, to hardest and/or less worthwhile
		2.3,  // Easy.   Boosts to crime success / money / CHA will speed along gangs, training and earning augmentations in the future
		5.3,  // Normal. Diminishing boost to hacking multipliers (8% -> 12% -> 14%), but relatively normal bitnode, especially with other features unlocked
		11.3, // Normal. Decrease augmentation cost scaling in a reset (4% -> 6% -> 7%) (can buy more augs per reset). Also boosts company salary/rep (32% -> 48% -> 56%), which we have little use for with gangs.)
		14.3, // Hard.   Makes go.js cheats slightly more successful, increases max go favour from (100->120) and not too difficult to get out of the way
		13.3, // Hard.   Make stanek's gift bigger to get more/different boosts
		9.2,  // Hard.   Start with 128 GB home ram. Speeds up slow-starting new BNs, but less important with good ram-dodging scripts. Hacknet productin/costs improved by 12% -> 18%.
		9.3,  // Hard.   Start each new BN with an already powerful hacknet server, but *only until the first reset*, which is a bit of a damper. Hacknet productin/costs improved by 18% -> 21%
		10.3, // Hard.   Get the last 2 sleeves (6 => 8) to boost their productivity ~30%. These really help with Bladeburner below. Putting this a little later because buying sleeves memory upgrades requires manual intervention right now.

		// 4th Priority: Play some Bladeburners. Mostly not used to beat other BNs, because for much of the BN this can't be done concurrently with player actions like crime/faction work, and no other BNs are "tuned" to be beaten via Bladeburner win condition
		6.3,  // Normal. The 3 easier bladeburner BNs. Boosts combat stats by 8% -> 12% -> 14%
		7.3,  // Hard.   The remaining 2 hard bladeburner BNs. Boosts all Bladeburner mults by 8% -> 12% -> 14%, so no interaction with other BNs unless trying to win via Bladeburner.

		// Low Priority:
		8.3,  // Hard.   Just gives stock "Limit orders" which we don't use in our scripts,
		3.3,  // Hard.   Corporations. I have no corp scripts, maybe one day I will. The history here is: in 2021, corps were too exploity and broke the game (inf. money). Also the APIs were buggy and new, so I skipped it. Autopilot will win normally while ignoring corps.
		12.9999 // Easy. Keep playing forever. Only stanek scales very well here, there is much work to be done to be able to climb these faster.
	];
	const doc = eval("document");
	const hook0 = doc.getElementById('overview-extra-hook-0');
	const hook1 = doc.getElementById('overview-extra-hook-1');
	while (true) {
		try {
			const headers = []
			const values = [];

			// Add current bitNode
			{
				headers.push('BitNode')
				let bitNode = ns.getResetInfo().currentNode;
				values.push(`${bitNode}.1`);

				const sfLevels = {};
				const player = ns.getPlayer();
				let hasSourceFiles = false;
				if (player.sourceFiles && player.sourceFiles.length > 0) {
					hasSourceFiles = true;
					for (const sf of player.sourceFiles) {
						sfLevels[sf.n] = sf.lvl;
					}
				}

				let nextBN = null;
				if (hasSourceFiles) {
					for (const bn of defaultBnOrder) {
						const bnNum = Math.floor(bn); // e.g. 4.3 -> 4
						const sfLevel = sfLevels[bnNum] || 0;
						if (sfLevel < 3) {
							nextBn = bn;
							break;
						}
					}
				} else {
					nextBN = defaultBnOrder[0]; // No source files, so next BN is the first one
				}

				if (nextBN !== null) {
					headers.push('Next BN Goal');
					values.push(`BN${nextBN} (SF${Math.floor(nextBN)}.${sfLevels[Math.floor(nextBN)] || 0}/3)`);
				}
			}

			// Add script income per second
			{
				headers.push('ScrInc');
				let scrInc = ns.formatNumber(ns.getTotalScriptIncome()[1], 3);
				values.push(`$${scrInc}/sec`);
			}

			// Add script exp gain rate per second
			{
				headers.push('ScrExp');
				let scrExp = ns.formatNumber(ns.getTotalScriptExpGain(), 3);
				values.push(`${scrExp}/sec`);
			}

			// Add server / Ram utilization stats
			{
				headers.push('Total Servers');
				values.push(`${servers.length}`);

				headers.push('Total Rooted');
				const nRooted = servers.filter(s => s.hasAdminRights).length;
				values.push(`${nRooted}`);

				const hnServers = servers.filter(s => s.hostname.startsWith("hacknet-server-") || s.hostname.startsWith("hacknet-node-"));
				const nPurchased = servers.filter(s => s.hostname != "home" && s.purchasedByPlayer).length; // "home" counts as purchased by the game
				headers.push('Total Purchased');
				if (hnServers.length > 0) {
					values.push(`${nPurchased - hnServers.length} servers`);
					headers.push('Total HNet Servers');
					values.push(`${hnServers.length} hnet servers`);
				} else {
					values.push(`${nPurchased}`);
				}

				headers.push('Home RAM');
				const home = servers.find(s => s.hostname == 'home');
				values.push(`${ns.formatRam(home.maxRam)} ${ns.formatPercent(home.ramUsed / home.maxRam, 1)}`);

				headers.push('All RAM');
				// If the user has any scripts running on hacknet servers, assume they want them included in the main "total available RAM" stat
				const includeHacknet = hnServers.some(s => s.ramUsed > 0);
				const filteredServers = servers.filter(s => s.hasAdminRights && !hnServers.includes(s));
				const [sMax, sUsed] = filteredServers.reduce(([tMax, tUsed], s) => [tMax + s.maxRam, tUsed + s.ramUsed], [0, 0]);
				const [hMax, hUsed] = hnServers.reduce(([tMax, tUsed], s) => [tMax + s.maxRam, tUsed + s.ramUsed], [0, 0]);
				const [tMax, tUsed] = [sMax + hMax, sUsed + hUsed];
				let statText = includeHacknet ?
					`${ns.formatRam(tMax)} ${(100 * tUsed / tMax).toFixed(1)}%` :
					`${ns.formatRam(sMax)} ${(100 * sUsed / sMax).toFixed(1)}%`;
				values.push(`${statText}`);
			}

			// Add Share power
			{
				const sharePower = ns.getSharePower();
				if (sharePower > 1.0001) {
					headers.push('Share Pwr');
					values.push(`${ns.formatNumber(sharePower, 3)}`);
				}
			}

			// Now drop it into the placeholder elements
			hook0.innerText = headers.join(" \n");
			hook1.innerText = values.join("\n");
		} catch (err) { // This might come in handy later
			ns.print("ERROR: Update Skipped: " + String(err));
		}
		await ns.sleep(1000);
	}
}