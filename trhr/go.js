import { homeServer } from "/trhr/var.constants.js";
import HackableBaseServer from "/trhr/if.server.hackable.js"
import BasePlayer from "/trhr/if.player.js";
import { dpList } from "/trhr/lib.utils.js"; 

function execHackingScript(ns, servers) {
	ns.disableLog("ALL");
	let home = new HackableBaseServer(ns, homeServer)
	let home_pids = home.pids;

	let hacking_scripts = home_pids.filter(p => p.filename.startsWith("/trhr/sbin.hack"))
	let hacking_script;

	if (hacking_scripts.length > 1) {
		throw "Two hacking scripts are running";
	} else {
		try { hacking_script = hacking_scripts[0]; } catch {}
	}
	let command = ns.peek(1);
	if (command == "NULL PORT DATA") { command = "/trhr/sbin.hack.roundrobin.js" }
	
	if (hacking_script) {
		if (hacking_script.filename !== command) {
			ns.kill(hacking_script.pid);
			servers.map(s => s.pids).flat().filter(proc => proc.filename.startsWith("/trhr/bin.")).forEach(proc => ns.kill(proc.pid));
			ns.exec(command, homeServer);
		}
	} else {
		ns.exec(command, homeServer);
	}
}

/** @param {NS} ns **/
export async function main(ns) {
	let player = new BasePlayer(ns, "player");
	// player.updateCache().catch(console.error);
	player.createEventListener("hacking.level").catch(console.error)
	player.createEventListener("faction.membership").catch(console.error)


	let servers = [];
	let slist = dpList(ns);
	for (let s of slist) {
		servers.push(new HackableBaseServer(ns, s))
	}

	for (let server of servers) {
		// server.updateCache().catch(console.error)
		server.createEventListener("admin").catch(console.error)
		server.createEventListener("backdoored").catch(console.error)
	}

	for (let server of servers) {
		await ns.scp(["/trhr/bin.wk.js", "/trhr/bin.hk.js", "/trhr/bin.gr.js"], homeServer, server.id)
	}

	while (true) {
		for (let server of servers) {
			// Gain admin on all servers that we can
			if (!server.admin && server.ports.required <= player.ports) {
				server.sudo();
			}
			// Upload files to any server that doesn't have them
			if (ns.ls(server.id, "bin.").length == 0) {
				await ns.scp(["/trhr/bin.wk.js", "/trhr/bin.hk.js", "/trhr/bin.gr.js"], homeServer, server.id)
			}
		}

		execHackingScript(ns, servers);
		await ns.asleep(10);
	}
}