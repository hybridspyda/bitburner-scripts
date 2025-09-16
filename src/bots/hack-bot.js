/** @param {NS} ns */
export async function main(ns) {
	try {
		await ns.hack(ns.args[0]);
	} catch {
		ns.toast(`Failed to hack ${ns.args[0]}`, 'error')
	}
}