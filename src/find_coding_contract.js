import { scanAllServers } from './helpers.js'

const argsSchema = [
	['attemptToSolve', false],
];

export function autocomplete(data, _) {
	data.flags(argsSchema);
	return [];
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


			let answer = solve(type, ns.codingcontract.getData(contract, server), ns);
			if (answer === "") {
				ns.tprint(`   No answer found.`);
				continue;
			} else {
				ns.print(`   Answer: ${answer}`);
			}

			if (!attemptToSolve) continue;
			ns.print(`   Attempting to solve...`);
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
		case "Algorithmic Stock Trader I":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Algorithmic Stock Trader II":
			{
				let profit = 0;
				for (let p = 1; p < data.length; ++p) {
					profit += Math.max(data[p] - data[p - 1], 0);
				}
				return profit.toString();
			}
		case "Algorithmic Stock Trader III":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Algorithmic Stock Trader IV":
			{
				const k = data[0];
				const prices = data[1];
				const len = prices.length;
				if (len < 2) {
					return 0;
				}
				if (k > len / 2) {
					let res = 0;
					for (let i = 1; i < len; ++i) {
						res += Math.max(prices[i] - prices[i - 1], 0);
					}
					return res;
				}
				const hold = [];
				const rele = [];
				hold.length = k + 1;
				rele.length = k + 1;
				for (let i = 0; i <= k; ++i) {
					hold[i] = Number.MIN_SAFE_INTEGER;
					rele[i] = 0;
				}
				let cur;
				for (let i = 0; i < len; ++i) {
					cur = prices[i];
					for (let j = k; j > 0; --j) {
						rele[j] = Math.max(rele[j], hold[j] + cur);
						hold[j] = Math.max(hold[j], rele[j - 1] - cur);
					}
				}
				return rele[k];
			}
		case "Array Jumping Game":
			{
				const n = data.length
				let i = 0
				for (let reach = 0; i < n && i <= reach; ++i) {
					reach = Math.max(i + data[i], reach)
				}
				const solution = i === n
				return solution ? 1 : 0
			}
		case "Array Jumping Game II":
			{
				if (data[0] == 0)
					return '0';
				const n = data.length;
				let reach = 0;
				let jumps = 0;
				let lastJump = -1;
				while (reach < n - 1) {
					let jumpedFrom = -1;
					for (let i = reach; i > lastJump; i--) {
						if (i + data[i] > reach) {
							reach = i + data[i];
							jumpedFrom = i;
						}
					}
					if (jumpedFrom === -1) {
						jumps = 0;
						break;
					}
					lastJump = jumpedFrom;
					jumps++;
				}
				return jumps;
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
		case "Compression II: LZ Decompression":
			{
				let compr = data;
				let plain = "";

				for (let i = 0; i < compr.length;) {
					const literal_length = compr.charCodeAt(i) - 0x30;

					if (literal_length < 0 || literal_length > 9 || i + 1 + literal_length > compr.length) {
						return null;
					}

					plain += compr.substring(i + 1, i + 1 + literal_length);
					i += 1 + literal_length;

					if (i >= compr.length) {
						break;
					}
					const backref_length = compr.charCodeAt(i) - 0x30;

					if (backref_length < 0 || backref_length > 9) {
						return null;
					} else if (backref_length === 0) {
						++i;
					} else {
						if (i + 1 >= compr.length) {
							return null;
						}

						const backref_offset = compr.charCodeAt(i + 1) - 0x30;
						if ((backref_length > 0 && (backref_offset < 1 || backref_offset > 9)) || backref_offset > plain.length) {
							return null;
						}

						for (let j = 0; j < backref_length; ++j) {
							plain += plain[plain.length - backref_offset];
						}

						i += 2;
					}
				}

				return plain;
			}
		case "Compression I: RLE Compression":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
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
		case "Encryption II: Vigenère Cipher":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Find All Valid Math Expressions":
			{
				const num = data[0];
				const target = data[1];

				function helper(res, path, num, target, pos, evaluated, multed) {
					if (pos === num.length) {
						if (target === evaluated) {
							res.push(path);
						}
						return;
					}
					for (let i = pos; i < num.length; ++i) {
						if (i != pos && num[pos] == '0') {
							break;
						}
						const cur = parseInt(num.substring(pos, i + 1));
						if (pos === 0) {
							helper(res, path + cur, num, target, i + 1, cur, cur);
						} else {
							helper(res, path + '+' + cur, num, target, i + 1, evaluated + cur, cur);
							helper(res, path + '-' + cur, num, target, i + 1, evaluated - cur, -cur);
							helper(res, path + '*' + cur, num, target, i + 1, evaluated - multed + multed * cur, multed * cur);
						}
					}
				}

				if (num == null || num.length === 0) {
					return [];
				}
				const result = [];
				helper(result, '', num, target, 0, 0, 0);
				return result;
			}
		case "Find Largest Prime Factor":
			{
				let fac = 2
				let n = data
				while (n > (fac - 1) * (fac - 1)) {
					while (n % fac === 0) {
						n = Math.round(n / fac)
					}
					++fac
				}
				return n === 1 ? fac - 1 : n
			}
		case "Generate IP Addresses":
			{
				const ret = []
				for (let a = 1; a <= 3; ++a) {
					for (let b = 1; b <= 3; ++b) {
						for (let c = 1; c <= 3; ++c) {
							for (let d = 1; d <= 3; ++d) {
								if (a + b + c + d === data.length) {
									const A = parseInt(data.substring(0, a), 10)
									const B = parseInt(data.substring(a, a + b), 10)
									const C = parseInt(data.substring(a + b, a + b + c), 10)
									const D = parseInt(data.substring(a + b + c, a + b + c + d), 10)
									if (A <= 255 && B <= 255 && C <= 255 && D <= 255) {
										const ip = [A.toString(), '.', B.toString(), '.', C.toString(), '.', D.toString()].join('')
										if (ip.length === data.length + 3) {
											ret.push(ip)
										}
									}
								}
							}
						}
					}
				}
				return ret.toString(); // Answer expected is the string representation of this array
			}
		case "HammingCodes: Encoded Binary to Integer":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "HammingCodes: Integer to Encoded Binary":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Merge Overlapping Intervals":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Minimum Path Sum in a Triangle":
			{
				const n = data.length;
				const dp = data[n - 1].slice();
				for (let i = n - 2; i > -1; --i) {
					for (let j = 0; j < data[i].length; ++j) {
						dp[j] = Math.min(dp[j], dp[j + 1]) + data[i][j];
					}
				}
				return dp[0];
			}
		case "Proper 2-Coloring of a Graph":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Sanitize Parentheses in Expression":
			{
				let left = 0;
				let right = 0;
				const res = [];
				for (let i = 0; i < data.length; ++i) {
					if (data[i] === '(') {
						++left;
					} else if (data[i] === ')') {
						left > 0 ? --left : ++right;
					}
				}

				function dfs(pair, index, left, right, s, solution, res) {
					if (s.length === index) {
						if (left === 0 && right === 0 && pair === 0) {
							for (let i = 0; i < res.length; i++) {
								if (res[i] === solution) {
									return;
								}
							}
							res.push(solution);
						}
						return;
					}
					if (s[index] === '(') {
						if (left > 0) {
							dfs(pair, index + 1, left - 1, right, s, solution, res);
						}
						dfs(pair + 1, index + 1, left, right, s, solution + s[index], res);
					} else if (s[index] === ')') {
						if (right > 0) dfs(pair, index + 1, left, right - 1, s, solution, res)
						if (pair > 0) dfs(pair - 1, index + 1, left, right, s, solution + s[index], res)
					} else {
						dfs(pair, index + 1, left, right, s, solution + s[index], res);
					}
				}
				dfs(0, 0, left, right, data, '', res);

				return res;
			}
		case "Shortest Path in a Grid":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Spiralize Matrix":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Square Root":
			{
				let n = data;
				const two = BigInt(2);
				if (n < two) return n; // Square root of 1 is 1, square root of 0 is 0
				let root = n / two; // Initial guess
				let x1 = (root + n / root) / two;
				while (x1 < root) {
					root = x1;
					x1 = (root + n / root) / two;
				}
				// That's it, solved! At least, we've converged an an answer which should be as close as we can get (might be off by 1)
				// We want the answer to the "nearest integer". Check the answer on either side of the one we converged on to see what's closest
				const bigAbs = (x) => x < 0n ? -x : x; // There's no Math.abs where we're going...
				let absDiff = bigAbs(root * root - n); // How far off we from the perfect square root
				if (absDiff == 0n) return root; // Note that this coding contract doesn't guarantee there's an exact integer square root
				else if (absDiff > bigAbs((root - 1n) * (root - 1n) - n)) root = root - 1n; // Do we get a better answer by subtracting 1?
				else if (absDiff > bigAbs((root + 1n) * (root + 1n) - n)) root = root + 1n; // Do we get a better answer by adding 1?
				// Validation: We should be able to tell if we got this right without wasting a guess. Adding/Subtracting 1 should now always be worse
				absDiff = bigAbs(root * root - n);
				if (absDiff > bigAbs((root - 1n) * (root - 1n) - n) ||
					absDiff > bigAbs((root + 1n) * (root + 1n) - n))
					throw new Error(`Square Root did not converge. Arrived at answer:\n${root} - which when squared, gives:\n${root * root} instead of\n${n}`);
				return root.toString();
			}
		case "Subarray with Maximum Sum":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Total Ways to Sum":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Total Ways to Sum II":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Unique Paths in a Grid I":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		case "Unique Paths in a Grid II":
			{
				ns.print(`'${contractType}' Not Implemented Yet...`);
				return "";
			}
		default:
			ns.print(`No solver for contract type '${contractType}'`);
			return "";
	}
}
