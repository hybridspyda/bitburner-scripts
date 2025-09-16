/** @param {NS} ns */
export async function main(ns) {
	try {
		await ns.weaken(ns.args[0]);
	} catch {
		ns.toast(`Failed to weaken ${ns.args[0]}`, 'error')
	}
}