import { scanAllServers } from './helpers.js'

const argsSchema = [
	['attemptToSolve', false],
];

export function autocomplete(data, _) {
	return data.servers;
}

/** @param {NS} ns */
export async function main(ns) {
	const options = ns.flags(argsSchema);
	const attemptToSolve = options.attemptToSolve;

	ns.disableLog('scan');
	ns.disableLog('sleep');
	ns.clearLog();

	let serverNames = scanAllServers(ns);
	let foundContracts = [];
	for (let hostname of serverNames) {
		if (ns.ls(hostname).find(f => f.endsWith('.cct')))
			foundContracts.push(hostname);
	}
	ns.print(JSON.stringify(foundContracts));
	if (foundContracts.length == 0) {
		ns.tprint("No coding contracts found.");
		return;
	}

	ns.tprint(`Found coding contract on the following servers: '${foundContracts.join(', ')}'.`)

	for (let server of foundContracts) {
		let contracts = ns.ls(server, '.cct');
		for (let contract of contracts) {
			let type = ns.codingcontract.getContractType(contract, server);
			let tries = ns.codingcontract.getNumTriesRemaining(contract, server);
			ns.tprint(` - ${server} :: ${contract} :: ${type} :: ${tries} tries remaining`);
			ns.print(` - ${server} :: ${contract} :: ${type} :: ${tries} tries remaining`);
			ns.print(`   ${ns.codingcontract.getDescription(contract, server)}`);
			ns.print(`   ${ns.codingcontract.getData(contract, server)}`);

			if (!attemptToSolve) continue;

			ns.print(`   Attempting to solve...`);
			let answer = solve(type, ns.codingcontract.getData(contract, server), ns);
			ns.print(`   Answer: ${answer}`);

			if (answer === "") {
				ns.tprint(`   No answer found.`);
				continue;
			}
			const reward = ns.codingcontract.attempt(answer, contract, server, { returnReward: true });
			if (reward) {
				ns.tprint(`   SUCCESS! Reward: ${reward}`);
			} else {
				ns.tprint(`   FAILURE!`);
			}
		}
	}
}

function solve(contractType, data, ns) {
	switch (contractType) {
		case "Encryption I: Caesar Cipher":
			{
				// Bitburner provides [message, shift] not [shift, message]
				const [message, shift] = data;
				const aCode = 'A'.charCodeAt(0);
				const zCode = 'Z'.charCodeAt(0);
				let decrypted = '';
				for (let char of message) {
					let code = char.charCodeAt(0);
					if (code >= aCode && code <= zCode) {
						let newCode = ((code - aCode - shift + 26) % 26) + aCode;
						decrypted += String.fromCharCode(newCode);
					} else {
						decrypted += char;
					}
				}
				return decrypted;
			}
		case "Compression III: LZ Compression":
			{
				let input = data;
				let cur_state = Array.from(Array(10), () => Array(10).fill(null));
				let new_state = Array.from(Array(10), () => Array(10));

				function set(state, i, j, str) {
					const current = state[i][j];
					if (current == null || str.length < current.length) {
						state[i][j] = str;
					} else if (str.length === current.length && Math.random() < 0.5) {
						// if two strings are the same length, pick randomly so that
						// we generate more possible inputs to Compression II
						state[i][j] = str;
					}
				}

				// initial state is a literal of length 1
				cur_state[0][1] = "";

				for (let i = 1; i < input.length; ++i) {
					for (const row of new_state) {
						row.fill(null);
					}
					const c = input[i];

					// handle literals
					for (let length = 1; length <= 9; ++length) {
						const string = cur_state[0][length];
						if (string == null) continue;

						if (length < 9) {
							// extend current literal
							set(new_state, 0, length + 1, string);
						} else {
							// start new literal
							set(new_state, 0, 1, string + "9" + input.substring(i - 9, i) + "0");
						}

						for (let offset = 1; offset <= Math.min(9, i); ++offset) {
							if (input[i - offset] === c) {
								// start new backreference
								set(new_state, offset, 1, string + length + input.substring(i - length, i));
							}
						}
					}

					// handle backreferences
					for (let offset = 1; offset <= 9; ++offset) {
						for (let length = 1; length <= 9; ++length) {
							const string = cur_state[offset][length];
							if (string == null) continue;

							if (input[i - offset] === c) {
								if (length < 9) {
									// extend current backreference
									set(new_state, offset, length + 1, string);
								} else {
									// start new backreference
									set(new_state, offset, 1, string + "9" + offset + "0");
								}
							}

							// start new literal
							set(new_state, 0, 1, string + length + offset);

							// end current backreference and start new backreference
							for (let new_offset = 1; new_offset <= Math.min(9, i); ++new_offset) {
								if (input[i - new_offset] === c) {
									set(new_state, new_offset, 1, string + length + offset + "0");
								}
							}
						}
					}

					const tmp_state = new_state;
					new_state = cur_state;
					cur_state = tmp_state;
				}

				let result = null;

				for (let len = 1; len <= 9; ++len) {
					let string = cur_state[0][len];
					if (string == null) continue;
					string += len + input.substring(input.length - len, input.length);
					if (result == null || string.length < result.length) {
						result = string;
					} else if (string.length == result.length && Math.random() < 0.5) {
						result = string;
					}
				}

				for (let offset = 1; offset <= 9; ++offset) {
					for (let len = 1; len <= 9; ++len) {
						let string = cur_state[offset][len];
						if (string == null) continue;
						string += len + "" + offset;
						if (result == null || string.length < result.length) {
							result = string;
						} else if (string.length == result.length && Math.random() < 0.5) {
							result = string;
						}
					}
				}

				return result ?? "";
			}
		default:
			ns.print(`No solver for contract type '${contractType}'`);
			return "";
	}
}
