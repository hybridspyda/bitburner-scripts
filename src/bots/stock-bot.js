/************************************************************
 * SECTION 1 — CONFIGURATION & CONSTANTS
 ************************************************************/
import { STOCK_SYMBOLS } from "../helpers.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	ns.clearLog();
	ns.ui.openTail();

	if (!ns.stock.hasWSEAccount() || !ns.stock.hasTIXAPIAccess() || !ns.stock.has4SDataTIXAPI()) {
		ns.tprint(`Stocks not yet unlocked, exiting.`);
		return;
	}

	// === Core Config ===
	const LONG_BUY_THRESHOLD = 0.6;
	const LONG_SELL_THRESHOLD = 0.5;
	const SHORT_SELL_THRESHOLD = 0.4;
	const SHORT_COVER_THRESHOLD = 0.5;
	const POSITION_SIZE = 0.1;
	const COMMISSION = 100_000;
	const HISTORY_LIMIT = 10;
	const COOLDOWN_MS = 300_000; // 5 minutes
	const TICK_INTERVAL = 3_000; // seconds in ms

	// === File Paths ===
	const PROFIT_FILE = "../Temp/stock-bot-profit.txt";
	const TRADES_FILE = "../Temp/stock-bot-trades.json";
	const SESSION_FILE = "../Temp/stock-bot-session.json";
	const TELEMETRY_FILE = "../Temp/stock-bot-telemetry.json";

	await ensureTransactScript(ns);

	/************************************************************
	 * SECTION 2 — DETECT SHORTING CAPABILITY & CLEANUP
	 ************************************************************/
	let canShort = false;
	try {
		const testSym = STOCK_SYMBOLS[0];
		ns.stock.buyShort(testSym, 1);
		ns.stock.sellShort(testSym, 1);
		canShort = true;
	} catch {
		ns.tprint("⚠ Short selling not available — running long-only mode.");
	}

	if (!canShort) {
		for (const sym of STOCK_SYMBOLS) {
			const [, , shortShares] = ns.stock.getPosition(sym);
			if (shortShares > 0) {
				try { ns.stock.sellShort(sym, shortShares); } catch { }
			}
		}
	}

	/************************************************************
	 * SECTION 3 — WRAPPERS & STATE LOADING
	 ************************************************************/
	const buyStockWrapper = (sym, shares) => transactStock(ns, sym, shares, "buyStock");
	const sellStockWrapper = (sym, shares) => transactStock(ns, sym, shares, "sellStock");
	const buyShortWrapper = (sym, shares) => canShort ? transactStock(ns, sym, shares, "buyShort") : Promise.resolve(0);
	const sellShortWrapper = (sym, shares) => canShort ? transactStock(ns, sym, shares, "sellShort") : Promise.resolve(0);

	let realisedProfit = ns.fileExists(PROFIT_FILE) ? (parseFloat(ns.read(PROFIT_FILE)) || 0) : 0;
	let tradeHistory = ns.fileExists(TRADES_FILE) ? JSON.parse(ns.read(TRADES_FILE) || "[]") : [];
	let sessionStats = ns.fileExists(SESSION_FILE) ? JSON.parse(ns.read(SESSION_FILE) || "{}") : {
		startTime: Date.now(),
		realised: 0,
		wins: 0,
		losses: 0
	};
	let telemetry = ns.fileExists(TELEMETRY_FILE) ? JSON.parse(ns.read(TELEMETRY_FILE) || "{}") : initTelemetry();
	const lastTradeTime = {};

	/************************************************************
	 * SECTION 4 — MAIN LOOP
	 ************************************************************/
	while (true) {
		let totalValue = 0;
		let unrealisedProfit = 0;

		for (const symbol of STOCK_SYMBOLS) {
			const forecast = ns.stock.getForecast(symbol);
			const price = ns.stock.getPrice(symbol);
			const [longShares, longAvg, shortShares, shortAvg] = ns.stock.getPosition(symbol);

			totalValue += (longShares + shortShares) * price;
			unrealisedProfit += (longShares * (price - longAvg)) + (shortShares * (shortAvg - price));

			const now = Date.now();
			const cooldownActive = lastTradeTime[symbol] && (now - lastTradeTime[symbol] < COOLDOWN_MS);

			// === LONG BUY ===
			if (!cooldownActive && forecast > LONG_BUY_THRESHOLD && longShares === 0 && shortShares === 0) {
				const shares = calcShares(ns, symbol, price, POSITION_SIZE);
				const potential = (forecast - 0.5) * price * shares;
				if (shares > 0 && potential > COMMISSION) {
					let buyPrice = canShort ? await buyStockWrapper(symbol, shares) : ns.stock.buyStock(symbol, shares);
					if (buyPrice) {
						logTrade(ns, tradeHistory, HISTORY_LIMIT, TRADES_FILE, "BUY", symbol, shares, buyPrice, 0);
						updateTelemetryOnEntry(telemetry, symbol, "LONG", shares, buyPrice, forecast, TICK_INTERVAL);
						lastTradeTime[symbol] = now;
					}
				}
			}

			// === LONG SELL ===
			if (!cooldownActive && forecast < LONG_SELL_THRESHOLD && longShares > 0) {
				let sellPrice = canShort ? await sellStockWrapper(symbol, longShares) : ns.stock.sellStock(symbol, longShares);
				if (sellPrice) {
					const profit = (sellPrice - longAvg) * longShares - COMMISSION;
					realisedProfit += profit;
					sessionStats.realised += profit;
					profit >= 0 ? sessionStats.wins++ : sessionStats.losses++;
					ns.write(PROFIT_FILE, realisedProfit, "w");
					ns.write(SESSION_FILE, JSON.stringify(sessionStats), "w");
					logTrade(ns, tradeHistory, HISTORY_LIMIT, TRADES_FILE, "SELL", symbol, longShares, sellPrice, profit);
					updateTelemetryOnExit(telemetry, symbol, "LONG", longShares, sellPrice, forecast, profit);
					lastTradeTime[symbol] = now;
				}
			}

			// === SHORT LOGIC ===
			if (canShort) {
				if (!cooldownActive && forecast < SHORT_SELL_THRESHOLD && shortShares === 0 && longShares === 0) {
					const shares = calcShares(ns, symbol, price, POSITION_SIZE);
					if (shares > 0 && (0.5 - forecast) * price * shares > COMMISSION) {
						const shortOpenPrice = await buyShortWrapper(symbol, shares);
						if (shortOpenPrice) {
							logTrade(ns, tradeHistory, HISTORY_LIMIT, TRADES_FILE, "SHORT", symbol, shares, shortOpenPrice, 0);
							updateTelemetryOnEntry(telemetry, symbol, "SHORT", shares, shortOpenPrice, forecast, TICK_INTERVAL);
							lastTradeTime[symbol] = now;
						}
					}
				}
				if (!cooldownActive && forecast > SHORT_COVER_THRESHOLD && shortShares > 0) {
					const coverPrice = await sellShortWrapper(symbol, shortShares);
					if (coverPrice) {
						const profit = (shortAvg - coverPrice) * shortShares - COMMISSION;
						realisedProfit += profit;
						sessionStats.realised += profit;
						profit >= 0 ? sessionStats.wins++ : sessionStats.losses++;
						ns.write(PROFIT_FILE, realisedProfit, "w");
						ns.write(SESSION_FILE, JSON.stringify(sessionStats), "w");
						logTrade(ns, tradeHistory, HISTORY_LIMIT, TRADES_FILE, "COVER", symbol, shortShares, coverPrice, profit);
						updateTelemetryOnExit(telemetry, symbol, "SHORT", shortShares, coverPrice, forecast, profit);
						lastTradeTime[symbol] = now;
					}
				}
			}
		}

		// Save telemetry each loop
		ns.write(TELEMETRY_FILE, JSON.stringify(telemetry), "w");

		/************************************************************
		 * SECTION 5 — DASHBOARD
		 ************************************************************/
		ns.clearLog();
		ns.print(`🔧 Mode: Longs ${canShort ? "& Shorts ✅" : "only 🚫 Shorts"}`);
		printRadar(ns, canShort);
		printRecentTrades(ns, tradeHistory);
		printPortfolioStats(ns, totalValue, unrealisedProfit, realisedProfit, sessionStats);
		printTelemetrySummary(ns, telemetry);

		await ns.sleep(TICK_INTERVAL);
	}
}

/************************************************************
 * SECTION 6 — TELEMETRY HELPERS
 ************************************************************/
function initTelemetry() {
	return {
		trades: [],
		avgHoldTime: 0,
		avgProfit: 0,
		avgProfitPerShare: 0,
		largestWin: 0,
		largestLoss: 0,
		capitalUtilisation: [],
		maxDrawdown: 0,
		lossStreak: 0,
		longestLossStreak: 0,
		profitBuckets: { small: 0, medium: 0, large: 0 },
		timeOfDay: {}
	};
}

function updateTelemetryOnEntry(telemetry, symbol, type, shares, price, forecast, tickInterval) {
	telemetry.trades.push({
		symbol,
		type,
		shares,
		entryPrice: price,
		entryForecast: forecast,
		entryTime: Date.now(),
		tickInterval // new field
	});
}

function updateTelemetryOnExit(telemetry, symbol, type, shares, price, forecast, profit) {
	const trade = telemetry.trades.find(t => t.symbol === symbol && t.type === type && !t.exitPrice);
	if (trade) {
		trade.exitPrice = price;
		trade.exitForecast = forecast;
		trade.exitTime = Date.now();
		trade.profit = profit;

		// --- Hold time ---
		const holdTime = trade.exitTime - trade.entryTime;
		telemetry.avgHoldTime = runningAverage(telemetry.avgHoldTime, holdTime, telemetry.trades.length);

		// --- Profit stats ---
		telemetry.avgProfit = runningAverage(telemetry.avgProfit, profit, telemetry.trades.length);
		telemetry.avgProfitPerShare = runningAverage(telemetry.avgProfitPerShare, profit / shares, telemetry.trades.length);

		// --- Largest win/loss ---
		if (profit > telemetry.largestWin) telemetry.largestWin = profit;
		if (profit < telemetry.largestLoss) telemetry.largestLoss = profit;

		// --- Profit buckets ---
		if (profit >= 1e9) telemetry.profitBuckets.large++;
		else if (profit >= 1e6) telemetry.profitBuckets.medium++;
		else telemetry.profitBuckets.small++;

		// --- Loss streak tracking ---
		if (profit < 0) {
			telemetry.lossStreak++;
			if (telemetry.lossStreak > telemetry.longestLossStreak) telemetry.longestLossStreak = telemetry.lossStreak;
		} else {
			telemetry.lossStreak = 0;
		}

		// --- Time-of-day performance ---
		const hour = new Date().getHours();
		if (!telemetry.timeOfDay[hour]) telemetry.timeOfDay[hour] = { wins: 0, losses: 0, profit: 0 };
		if (profit >= 0) telemetry.timeOfDay[hour].wins++; else telemetry.timeOfDay[hour].losses++;
		telemetry.timeOfDay[hour].profit += profit;
	}
}

/************************************************************
 * SECTION 7 — DASHBOARD HELPERS
 ************************************************************/
function printRadar(ns, canShort) {
	let radarList = STOCK_SYMBOLS
		.map(sym => {
			const forecast = ns.stock.getForecast(sym);
			const price = ns.stock.getPrice(sym);
			const shares = calcShares(ns, sym, price, 0.1);
			const potential = (forecast - 0.5) * price * shares;
			return { sym, forecast, price, potential };
		})
		.sort((a, b) => b.forecast - a.forecast);

	ns.print("📡 Market Radar (Top 5 Longs):");
	for (const r of radarList.slice(0, 5)) {
		ns.print(`${r.sym.padEnd(5)} | fc=${(r.forecast * 100).toFixed(1)}% | $${ns.formatNumber(r.price)} | pot=${ns.formatNumber(r.potential)}`);
	}

	if (canShort) {
		let shortList = STOCK_SYMBOLS
			.map(sym => {
				const forecast = ns.stock.getForecast(sym);
				const price = ns.stock.getPrice(sym);
				const shares = calcShares(ns, sym, price, 0.1);
				const potential = (0.5 - forecast) * price * shares;
				return { sym, forecast, price, potential };
			})
			.sort((a, b) => a.forecast - b.forecast);

		ns.print("📉 Market Radar (Top 5 Shorts):");
		for (const r of shortList.slice(0, 5)) {
			ns.print(`${r.sym.padEnd(5)} | fc=${(r.forecast * 100).toFixed(1)}% | $${ns.formatNumber(r.price)} | pot=${ns.formatNumber(r.potential)}`);
		}
	}
	ns.print("");
}

function printRecentTrades(ns, tradeHistory) {
	ns.print("📜 Recent Trades:");
	ns.print("Time   | Action | Symbol | Shares | Price | Profit");
	ns.print("-----------|--------|--------|--------|-----------|-----------");
	for (let i = tradeHistory.length - 1; i >= 0; i--) {
		const t = tradeHistory[i];
		ns.print(`${t.time} | ${t.action.padEnd(6)} | ${t.symbol.padEnd(6)} | ${t.shares.toString().padEnd(6)} | $${ns.formatNumber(t.price).padEnd(9)} | ${colorize(t.profit, ns)}`);
	}
	ns.print("");
}

function printPortfolioStats(ns, totalValue, unrealisedProfit, realisedProfit, sessionStats) {
	ns.print(`📊 Portfolio Value: $${ns.formatNumber(totalValue)}`);
	ns.print(`📈 Unrealised P/L:  ${colorize(unrealisedProfit, ns)}`);
	ns.print(`💵 Realised P/L: ${colorize(realisedProfit, ns)}`);
	ns.print(`📅 Session Realised: ${colorize(sessionStats.realised, ns)}`);
	ns.print(`🏆 Session Win Rate: ${((sessionStats.wins / Math.max(1, sessionStats.wins + sessionStats.losses)) * 100).toFixed(1)}%`);
}

function printTelemetrySummary(ns, telemetry) {
	ns.print("📊 Telemetry Snapshot:");
	ns.print(`Avg Hold Time: ${(telemetry.avgHoldTime / 1000).toFixed(1)}s`);
	ns.print(`Avg Profit: ${colorize(telemetry.avgProfit, ns)}`);
	ns.print(`Largest Win: ${colorize(telemetry.largestWin, ns)}`);
	ns.print(`Largest Loss: ${colorize(telemetry.largestLoss, ns)}`);
	ns.print(`Longest Loss Streak: ${telemetry.longestLossStreak}`);
}

/************************************************************
 * SECTION 8 — GENERIC HELPERS
 ************************************************************/
function calcShares(ns, symbol, price, positionSize) {
	const maxAffordable = Math.floor(ns.getServerMoneyAvailable("home") / price);
	return Math.min(Math.floor(ns.stock.getMaxShares(symbol) * positionSize), maxAffordable);
}

function logTrade(ns, history, limit, file, action, symbol, shares, price, profit) {
	const time = new Date().toLocaleTimeString();
	history.unshift({ time, action, symbol, shares, price, profit });
	if (history.length > limit) history.pop();
	ns.write(file, JSON.stringify(history), "w");

	const msg = `${action} ${shares} ${symbol} @ $${ns.formatNumber(price)}${profit ? ` | P/L: ${ns.formatNumber(profit)}` : ""}`;
	ns.toast(msg, profit >= 0 ? "success" : "error", 4_000);
	ns.tprint(msg);
}

function colorize(value, ns) {
	const str = `$${ns.formatNumber(value)}`;
	if (value > 0) return `\u001b[32m${str}\u001b[0m`;
	if (value < 0) return `\u001b[31m${str}\u001b[0m`;
	return str;
}

function runningAverage(currentAvg, newValue, count) {
	return ((currentAvg * (count - 1)) + newValue) / count;
}

/************************************************************
 * SECTION 9 — TRANSACT SCRIPT HELPERS
 ************************************************************/
async function transactStock(ns, sym, shares, action) {
	const script = "../Temp/stock-transact.js";
	const out = "../Temp/stock-transact.txt";
	await ensureTransactScript(ns);

	if (ns.fileExists(out)) ns.rm(out);
	const pid = ns.run(script, 1, action, sym, shares, out);
	if (!pid) return 0;

	const timeout = Date.now() + 10_000;
	while (Date.now() < timeout) {
		await ns.sleep(25);
		if (ns.fileExists(out)) {
			const raw = ns.read(out)?.trim();
			if (!raw) return 0;
			if (raw.startsWith("ERR:")) {
				ns.print(`❌ Transact error for ${action} ${sym} x${shares}: ${raw}`);
				return 0;
			}
			const num = parseFloat(raw);
			return Number.isFinite(num) ? num : 0;
		}
	}
	ns.print(`⏳ Transact timeout for ${action} ${sym} x${shares}`);
	return 0;
}

async function ensureTransactScript(ns) {
	const script = "../Temp/stock-transact.js";
	if (ns.fileExists(script)) return;
	const code = `/** Auto-generated tiny stock transact proxy */
	export async function main(ns) {
		const [action, sym, shares, out] = ns.args;
		try {
			let price = 0;
			switch (action) {
				case "buyStock":  price = ns.stock.buyStock(sym, shares); break;
				case "sellStock": price = ns.stock.sellStock(sym, shares); break;
				case "buyShort":  price = ns.stock.buyShort(sym, shares); break;
				case "sellShort": price = ns.stock.sellShort(sym, shares); break;
				default: throw new Error("Unknown action: " + action);
			}
			await ns.write(out, String(price ?? 0), "w");
		} catch (e) {
			await ns.write(out, "ERR:" + e, "w");
		}
	}`;
	await ns.write(script, code, "w");
}