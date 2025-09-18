/** @param {NS} ns */
export async function main(ns) {
	let target = ns.args[0];
	try {
		await ns.hack(target);
	} catch {
		ns.toast(`Failed to hack ${target}`, 'error');
	}
}