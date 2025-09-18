import { STOCK_SYMBOLS } from "./helpers.js";

/** @param {NS} ns **/
export async function main(ns) {
	ns.disableLog("ALL");
	ns.clearLog();
	if (ns.ui?.openTail) ns.ui.openTail(); else ns.tail();

	// === Config ===
	const LONG_BUY_THRESHOLD = 0.6;
	const LONG_SELL_THRESHOLD = 0.5;
	const SHORT_SELL_THRESHOLD = 0.4;
	const SHORT_COVER_THRESHOLD = 0.5;
	const POSITION_SIZE = 0.1;
	const COMMISSION = 100_000;
	const HISTORY_LIMIT = 10;
	const PROFIT_FILE = "stock-bot-profit.txt";
	const TRADES_FILE = "stock-bot-trades.json";
	const SESSION_FILE = "stock-bot-session.json";
	const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

	await ensureTransactScript(ns);

	// === Detect shorting capability ===
	let canShort = false;
	try {
		const testSym = STOCK_SYMBOLS[0];
		ns.stock.buyShort(testSym, 1);
		ns.stock.sellShort(testSym, 1);
		canShort = true;
	} catch {
		ns.tprint("⚠ Short selling not available — running long-only mode.");
	}

	// === Clean up leftover shorts in long-only mode ===
	if (!canShort) {
		for (const sym of STOCK_SYMBOLS) {
			const [, , shortShares] = ns.stock.getPosition(sym);
			if (shortShares > 0) {
				try { ns.stock.sellShort(sym, shortShares); } catch { }
			}
		}
	}

	// === Wrappers ===
	const buyStockWrapper = (sym, shares) => transactStock(ns, sym, shares, "buyStock");
	const sellStockWrapper = (sym, shares) => transactStock(ns, sym, shares, "sellStock");
	const buyShortWrapper = (sym, shares) => canShort ? transactStock(ns, sym, shares, "buyShort") : Promise.resolve(0);
	const sellShortWrapper = (sym, shares) => canShort ? transactStock(ns, sym, shares, "sellShort") : Promise.resolve(0);

	// === Load persistent state ===
	let realisedProfit = ns.fileExists(PROFIT_FILE) ? (parseFloat(ns.read(PROFIT_FILE)) || 0) : 0;
	let tradeHistory = ns.fileExists(TRADES_FILE) ? JSON.parse(ns.read(TRADES_FILE) || "[]") : [];
	let sessionStats = ns.fileExists(SESSION_FILE) ? JSON.parse(ns.read(SESSION_FILE) || "{}") : {
		startTime: Date.now(),
		realised: 0,
		wins: 0,
		losses: 0
	};
	const lastTradeTime = {}; // cooldown tracking

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

			// === LONG LOGIC ===
			if (!cooldownActive && forecast > LONG_BUY_THRESHOLD && longShares === 0 && shortShares === 0) {
				const shares = calcShares(ns, symbol, price, POSITION_SIZE);
				const potential = (forecast - 0.5) * price * shares;
				if (shares > 0 && potential > COMMISSION) {
					let buyPrice;
					if (canShort) {
						buyPrice = await buyStockWrapper(symbol, shares);
						if (!buyPrice) ns.print(`❌ Wrapper failed for ${symbol} — no buy placed`);
					} else {
						buyPrice = ns.stock.buyStock(symbol, shares);
						ns.print(`✅ Direct buy for ${symbol} at $${ns.formatNumber(buyPrice)}`);
					}
					if (buyPrice) {
						logTrade(ns, tradeHistory, HISTORY_LIMIT, TRADES_FILE, "BUY", symbol, shares, buyPrice, 0);
						lastTradeTime[symbol] = now;
					}
				}
			}

			if (!cooldownActive && forecast < LONG_SELL_THRESHOLD && longShares > 0) {
				let sellPrice;
				if (canShort) {
					sellPrice = await sellStockWrapper(symbol, longShares);
					if (!sellPrice) ns.print(`❌ Wrapper failed for ${symbol} — no sell placed`);
				} else {
					sellPrice = ns.stock.sellStock(symbol, longShares);
					ns.print(`✅ Direct sell for ${symbol} at $${ns.formatNumber(sellPrice)}`);
				}
				if (sellPrice) {
					const profit = (sellPrice - longAvg) * longShares - COMMISSION;
					realisedProfit += profit;
					sessionStats.realised += profit;
					if (profit >= 0) sessionStats.wins++; else sessionStats.losses++;
					ns.write(PROFIT_FILE, realisedProfit, "w");
					ns.write(SESSION_FILE, JSON.stringify(sessionStats), "w");
					logTrade(ns, tradeHistory, HISTORY_LIMIT, TRADES_FILE, "SELL", symbol, longShares, sellPrice, profit);
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
						if (profit >= 0) sessionStats.wins++; else sessionStats.losses++;
						ns.write(PROFIT_FILE, realisedProfit, "w");
						ns.write(SESSION_FILE, JSON.stringify(sessionStats), "w");
						logTrade(ns, tradeHistory, HISTORY_LIMIT, TRADES_FILE, "COVER", symbol, shortShares, coverPrice, profit);
						lastTradeTime[symbol] = now;
					}
				}
			}
		}

		// === DASHBOARD ===
		ns.clearLog();
		ns.print(`🔧 Mode: Longs ${canShort ? "& Shorts ✅" : "only 🚫 Shorts"}`);

		// Market Radar
		printRadar(ns, canShort);

		// Recent Trades
		ns.print("📜 Recent Trades:");
		ns.print("Time       | Action | Symbol | Shares | Price     | Profit");
		ns.print("-----------|--------|--------|--------|-----------|-----------");
		for (let i = tradeHistory.length - 1; i >= 0; i--) {
			const t = tradeHistory[i];
			ns.print(`${t.time} | ${t.action.padEnd(6)} | ${t.symbol.padEnd(6)} | ${t.shares.toString().padEnd(6)} | $${ns.formatNumber(t.price).padEnd(9)} | ${colorize(t.profit, ns)}`);
		}
		ns.print(" ");

		// Portfolio + Session Stats
		ns.print(`📊 Portfolio Value: $${ns.formatNumber(totalValue)}`);
		ns.print(`📈 Unrealised P/L:  ${colorize(unrealisedProfit, ns)}`);
		ns.print(`💵 Realised P/L:    ${colorize(realisedProfit, ns)}`);
		ns.print(`📅 Session Realised: ${colorize(sessionStats.realised, ns)}`);
		ns.print(`🏆 Session Win Rate: ${((sessionStats.wins / Math.max(1, sessionStats.wins + sessionStats.losses)) * 100).toFixed(1)}%`);

		await ns.sleep(1_000);
	}
}

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
	ns.print(" ");
}

async function transactStock(ns, sym, shares, action) {
	const script = "/Temp/stock-transact.js";
	const out = "/Temp/stock-transact.txt";
	await ensureTransactScript(ns);

	if (ns.fileExists(out)) ns.rm(out);
	const pid = ns.run(script, 1, action, sym, shares, out);
	if (!pid) return 0;

	const timeout = Date.now() + 10_000; // extended from 5s
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
	const script = "/Temp/stock-transact.js";
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