/** @param {NS} ns */
export async function main(ns) {
	try {
		await ns.grow(ns.args[0]);
	} catch {
		ns.toast(`Failed to grow ${ns.args[0]}`, 'error')
	}
}