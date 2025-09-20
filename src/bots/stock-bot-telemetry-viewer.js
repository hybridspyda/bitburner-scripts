/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	ns.clearLog();
	ns.ui.openTail();

	const TELEMETRY_FILE = "../Temp/stock-bot-telemetry.json";
	const SESSION_FILE = "../Temp/stock-bot-session.json";

	if (!ns.fileExists(TELEMETRY_FILE) || !ns.fileExists(SESSION_FILE)) {
		ns.tprint("❌ Telemetry or session file not found. Run stock-bot.js first.");
		return;
	}

	const telemetry = JSON.parse(ns.read(TELEMETRY_FILE) || "{}");
	const session = JSON.parse(ns.read(SESSION_FILE) || "{}");

	ns.print("=== 📊 STOCK BOT TELEMETRY SNAPSHOT ===");
	ns.print(`Session Start: ${new Date(session.startTime).toLocaleString()}`);
	ns.print(`Session Realised: ${fmt(session.realised)}`);
	ns.print(`Session Wins: ${session.wins} | Losses: ${session.losses}`);
	ns.print(`Win Rate: ${((session.wins / Math.max(1, session.wins + session.losses)) * 100).toFixed(1)}%`);
	ns.print("");
	
	ns.print(`Avg Hold Time: ${(telemetry.avgHoldTime/1000).toFixed(1)}s`);
	ns.print(`Avg Profit: ${fmt(telemetry.avgProfit)}`);
	ns.print(`Avg Profit/Share: ${fmt(telemetry.avgProfitPerShare)}`);
	ns.print(`Largest Win: ${fmt(telemetry.largestWin)}`);
	ns.print(`Largest Loss: ${fmt(telemetry.largestLoss)}`);
	ns.print("");
	
	ns.print("Profit Buckets:");
	ns.print(`  Small (<1M): ${telemetry.profitBuckets.small}`);
	ns.print(`  Medium (1M-1B): ${telemetry.profitBuckets.medium}`);
	ns.print(`  Large (>=1B): ${telemetry.profitBuckets.large}`);
	ns.print("");
	
	ns.print(`Longest Loss Streak: ${telemetry.longestLossStreak}`);
	ns.print("");
	
	ns.print("Time-of-Day Performance:");
	for (const hour of Object.keys(telemetry.timeOfDay).sort((a,b) => a-b)) {
		const data = telemetry.timeOfDay[hour];
		const wr = ((data.wins / Math.max(1, data.wins + data.losses)) * 100).toFixed(1);
		ns.print(`  ${hour.padStart(2,"0")}:00 — Wins: ${data.wins}, Losses: ${data.losses}, WinRate: ${wr}%, Profit: ${fmt(data.profit)}`);
	}

	const byInterval = {};
	for (const t of telemetry.trades) {
		const key = `${t.tickInterval/1000}s`;
		if (!byInterval[key]) byInterval[key] = { wins: 0, losses: 0, profit: 0 };
		if (t.profit >= 0) byInterval[key].wins++; else byInterval[key].losses++;
		byInterval[key].profit += t.profit || 0;
	}

	/*ns.print("\nPerformance by Tick Interval:");
	for (const [interval, stats] of Object.entries(byInterval)) {
		const wr = ((stats.wins / Math.max(1, stats.wins + stats.losses)) * 100).toFixed(1);
		ns.print(`  ${interval} — Wins: ${stats.wins}, Losses: ${stats.losses}, WinRate: ${wr}%, Profit: ${fmt(stats.profit)}`);
	}*/
	
	// Convert and sort by win rate descending
	const sortedByWinRate = Object.entries(byInterval)
		.map(([interval, stats]) => {
			const total = stats.wins + stats.losses;
			const winRate = (stats.wins / Math.max(1, total)) * 100;
			return { interval, ...stats, winRate };
		})
		.sort((a, b) => b.winRate - a.winRate); // highest win rate first

	ns.print("\n📊 Performance by Tick Interval (sorted by Win Rate):");
	for (const stats of sortedByWinRate) {
		const wr = stats.winRate.toFixed(1);
		ns.print(`  ${stats.interval} — Wins: ${stats.wins}, Losses: ${stats.losses}, WinRate: ${wr}%, Profit: ${fmt(stats.profit)}`);
	}
}

function fmt(num) {
	if (num === undefined) return "-";
	return (num >= 0 ? "\u001b[32m" : "\u001b[31m") + "$" + num.toLocaleString(undefined, {maximumFractionDigits: 3}) + "\u001b[0m";
}