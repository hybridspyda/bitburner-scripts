/** @param {NS} ns */
export async function main(ns) {
	while(true) {
		await ns.share();
		await ns.sleep(100); // Sleep for 100ms between shares to reduce CPU usage
	}
}