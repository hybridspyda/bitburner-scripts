/** @param {NS} ns **/
import { handleDB } from "/lib/db.js";
import { Cacheable } from "/lib/utils.js";

export default class BasePlayer extends Cacheable {
	constructor(ns, id) {
		super();
		this.ns = ns;
		this._id = id;
	}

	listGetters(instance, properties=new Set()) {
		let getters = Object.entries(
			Object.getOwnPropertyDescriptors(
				Reflect.getPrototypeOf(instance)
			)).filter(e => typeof e[1]["get"] === 'function' && e[0] !== '__proto__').map(e => e[0])

		getters.forEach(g => {
			properties.add(g);
			return this.listGetters(Object.getPrototypeOf(instance), properties)
		})
		return properties
	}

	get id() { return this._id }
	/**
	*	@returns {import(".").Player}
	*/
	get data() { return this.ns.getPlayer(); }
	get updated_at() { return new Date().valueOf() }
	get hp() {
		return {
			current: this.data.hp.current,
			max: this.data.hp.max
		}
	}
	get level() { return this.data.skills.hacking }
	get money() { return this.data.money }
	get intelligence() { return this.data.skills.intelligence }
	get city() { return this.data.city }
	get className() { return this.data.className }
	get company() {
		return {
			companyName: this.data.companyName,
			multipliers: {
				rep: this.data.mults.company_rep
			}
		}
	}
	get bladeburner() {
		return {
			multipliers: {
				analysis: this.data.mults.bladeburner_analysis,
				max_stamina: this.data.mults.bladeburner_max_stamina,
				stamina_gain: this.data.mults.bladeburner_stamina_gain,
				success_chance: this.data.mults.bladeburner_success_chance,
			}
		}
	}
	get createProg() {
		return {
			progName: this.data["createProgramName"],
			reqLevel: this.data["createProgramReqLvl"]
		}
	}
	get crime() {
		return {
			type: this.data.crimeType,
			multipliers: {
					money: this.data.mults.crime_money,
					success: this.data.mults.crime_success
			},
			kills: this.data.numPeopleKilled,
			karma: this.ns.heart.break()
		}
	}
	get work() {
		return {
			isWorking: this.data.isWorking,
			type: this.data.workType,
			jobs: this.data.jobs,
			current: {
				factionName: this.data.currentWorkFactionName,
				factionDesc: this.data.currentWorkFactionDescription
			},
			multipliers: {
				money: this.data.mults.work_money
			},
			stats: {
				agi: {
					gained: this.data.workAgiExpGained,
					rate: this.data.workAgiExpGainRate
				},
				str: {
					gained: this.data.workStrExpGained,
					rate: this.data.workStrExpGainRate
				},
				cha: {
					gained: this.data.workChaExpGained,
					rate: this.data.workChaExpGainRate
				},
				dex: {
					gained: this.data.workDexExpGained,
					rate: this.data.workDexExpGainRate
				},
				def: {
					gained: this.data.workDefExpGained,
					rate: this.data.workDefExpGainRate
				},
				hack: {
					gained: this.data.workHackExpGained,
					rate: this.data.workHackExpGainRate
				},
				money: {
					gained: this.data.workMoneyExpGained,
					rate: this.data.workMoneyExpGainRate,
					loss: this.data.workMoneyLossRate
				},
				rep: {
					gained: this.data.workRepGained,
					rate: this.data.workRepGainRate
				}
			}
		}
	}
	get charisma() {
		return {
			level: this.data.skills.charisma,
			exp: this.data.exp.charisma,
			multipliers: {
				exp: this.data.mults.charisma_exp,
				level: this.data.mults.charisma,
			}
		}
	}
	get agility() {
		return {
			level: this.data.skills.agility,
			exp: this.data.exp.agility,
			multipliers: {
				exp: this.data.mults.agility_exp,
				level: this.data.mults.agility,
			}
		}
	}
	get dexterity() {
		return {
			level: this.data.skills.dexterity,
			exp: this.data.exp.dexterity,
			multipliers: {
				exp: this.data.mults.dexterity_exp,
				level: this.data.mults.dexterity,
			}
		}
	}
	get defense() {
		return {
			level: this.data.skills.defense,
			exp: this.data.exp.defense,
			multipliers: {
				exp: this.data.mults.defense_exp,
				level: this.data.mults.defense,
			}
		}
	}
	get strength() {
		return {
			level: this.data.skills.strength,
			exp: this.data.exp.strength,
			multipliers: {
				exp: this.data.mults.strength_exp,
				level: this.data.mults.strength,
			}
		}
	}
	get faction() {
		return {
			membership: this.data.factions,
			multipliers: {
				rep: this.data.mults.faction_rep
			}
		}
	}
	get hacking() {
		return {
			exp: this.data.exp.hacking,
			level: this.data.skills.hacking,
			next_level_exp: Math.pow(Math.E,((this.data.skills.hacking + 1)/(32*this.data.mults.hacking)+(25/4))) - (1069/2),
			tnl: Math.pow(Math.E,((this.data.skills.hacking + 1)/(32*this.data.mults.hacking)+(25/4))) - (1069/2) - this.data.exp.hacking,
			multipliers: {
				chance: this.data.mults.hacking_chance,
				exp: this.data.mults.hacking_exp,
				grow: this.data.mults.hacking_grow,
				money: this.data.mults.hacking_money,
				level: this.data.mults.hacking,
				speed: this.data.mults.hacking_speed
			}
		}
	}
	get hnet() {
		return {
			multipliers: {
				coreCost: this.data.mults.hacknet_node_core_cost,
				levelCost: this.data.mults.hacknet_node_level_cost,
				production: this.data.mults.hacknet_node_money,
				purchaseCost: this.data.mults.hacknet_node_purchase_cost,
				ramCost: this.data.mults.hacknet_node_ram_cost,
			}
		}
	}
	get market() {
		return {
			api: {
				tix: this.data.hasTixApiAccess,
				fourSigma: this.data.has4SDataTixApi
			},
			manual: {
				wse: this.data.hasWseAccount,
				fourSigma: this.data.has4SData
			}
		}
	}
	get playtime() {
		return {
			total: this.data.totalPlaytime,
			sinceAug: this.data.playtimeSinceLastAug,
			sinceBitnode: this.data.playtimeSinceLastBitnode
		}
	}

	get ports() {
		return this.ns.ls("home").filter(file => [
			"BruteSSH.exe",
			"FTPCrack.exe",
			"relaySMTP.exe",
			"HTTPWorm.exe",
			"SQLInject.exe"
		].includes(file)).length
	}

	get software() {
		return {
			tor: this.data.tor,
			ssh: this.ns.ls("home").some(file => file === "BruteSSH.exe"),
			ftp: this.ns.ls("home").some(file => file === "FTPCrack.exe"),
			smtp: this.ns.ls("home").some(file => file === "relaySMTP.exe"),
			http: this.ns.ls("home").some(file => file === "HTTPWorm.exe"),
			sql: this.ns.ls("home").some(file => file === "SQLInject.exe"),
			formulas: this.ns.ls("home").some(file => file === "Formulas.exe"),
		}
	}

	async updateCache(repeat=true, kv=new Map()) {
		do {
			const db = await handleDB();
			let old = await db["get"]("player", this.id) || {}
			let getters = this.listGetters(this)
			getters.forEach(g => {
				old[g] = this[g];
			})
			kv.forEach((v,k) => old[k] = v)

			await db["put"]("player", old)
			if (repeat) { await this.ns.asleep(Math.random()*10000) + 55000 }
		} while (repeat)
	}

}