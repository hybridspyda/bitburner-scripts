
/** @param {NS} ns */
export async function main(ns) {
	
	getHacknetMoney(ns);

	//const OUTPUT = '/Temp/test-output.txt';
	//ns.write(OUTPUT, `${ns.stock.getSymbols()}`, 'w');

	//let hostname = ns.args[0];

	//ns.killall(hostname);
	//ns.deleteServer(hostname);

	/*ns.ui.openTail();
	ns.disableLog('sleep');*/

	/*let char;
	while(true) {
		ns.clearLog();
		char = loadingWheel(char);
		ns.print(char);
		await ns.sleep(1_000);
	}*/

	/*let frame;
	while (true) {
		ns.clearLog();
		frame = asciiSpinner(frame);
		ns.print(frame);
		ns.print("\nBooting Bot Commander Army...");
		await ns.sleep(200); // faster tick for smoother animation
	}*/

	// Phase 1: Loading animation
	/*for (let p = 0; p <= 100; p += 1) {
		ns.clearLog();
		ns.print("🚀 Initialising Bot Commander Army...");
		ns.print(progressBar(p));
		await ns.sleep(200);
	}

	// Phase 2: Dramatic countdown
	for (let i = 5; i >= 1; i--) {
		ns.clearLog();
		ns.print("🔥 All systems armed!");
		ns.print(`Launching in... ${i}`);
		await ns.sleep(1000);
	}

	// Phase 3: ASCII explosion + launch message
	const explosion = [
`         _.-^^---....,,--       
     _--                  --_  
    <                        >)
    |                         | 
     \._                   _./  
        '''--. . , ; .--'''     
              | |   |           
           .-=||  | |=-.        
           '-=#$%&%$#=-'        
              | ;  :|           
     _____.,-#%&$@%#&#~,._____  `,
`💥💥💥 BOT COMMANDER ARMY DEPLOYED 💥💥💥`
	];

	ns.clearLog();
	ns.print(explosion[0]);
	ns.print("\n" + explosion[1]);*/


}

/*function loadingWheel(currentPos) {
	const symbol = ['🕛','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚'];
	const idx = currentPos ? (symbol.indexOf(currentPos) + 1) % symbol.length : 0;
	return symbol[idx];
}

function asciiSpinner(currentFrame) {
	const frames = [
`   ╔═══╗
   ║   ║
╔══╝   ╚══╗
║         ║
╚══╗   ╔══╝
   ║   ║
   ╚═══╝`,

`   ╔═╗
╔══╝ ╚══╗
║       ║
╚══╗ ╔══╝
   ║ ║
   ╚═╝`,

`    ╔═╗
╔═══╝ ╚═══╗
║         ║
╚═══╗ ╔═══╝
    ║ ║
    ╚═╝`,

`     ╔═╗
╔════╝ ╚════╗
║           ║
╚════╗ ╔════╝
     ║ ║
     ╚═╝`
	];

	const idx = currentFrame ? (frames.indexOf(currentFrame) + 1) % frames.length : 0;
	return frames[idx];
}

function progressBar(percent) {
	const totalBars = 50; // width of the bar (30 default)
	const filledBars = Math.floor((percent / 100) * totalBars);
	const emptyBars = totalBars - filledBars;
	return `[${'█'.repeat(filledBars)}${' '.repeat(emptyBars)}] ${percent.toFixed(0)}%`;
}*/

function getHacknetMoney(ns) {
	const m = ns.getMoneySources();

  const spentInstall = m.sinceInstall.hacknet_expenses ?? 0;
  const producedInstall = m.sinceInstall.hacknet ?? 0;

  const spentStart = m.sinceStart.hacknet_expenses ?? 0;
  const producedStart = m.sinceStart.hacknet ?? 0;

  ns.tprint(`Hacknet (since install): Spent $${ns.formatNumber(spentInstall)}, Produced $${ns.formatNumber(producedInstall)}`);
  ns.tprint(`Hacknet (since BN start): Spent $${ns.formatNumber(spentStart)}, Produced $${ns.formatNumber(producedStart)}`);
}