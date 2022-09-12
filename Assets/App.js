// SPDX-License-Identifier: CC-BY-SA-4.0

function Dcr(Cr) {
	let Chars = Cr.split('').reverse();
	for (let i = 0; i < Chars.length; i++) {
		let c = Chars[i];
		if (!isNaN(c)) Chars[i] = Math.abs(c-9);
		else if (c == '#') Chars[i] = '=';
		else if (c == c.toLowerCase()) Chars[i] = c.toUpperCase();
		else if (c == c.toUpperCase()) Chars[i] = c.toLowerCase();
	}
	return atob(Chars.join(''));
}

function Init(d) {
	//try {
		let HTML;
		//if (d["B64"] != '') HTML = atob(d["B64"]);
		/*else*/ if (d["Cr"] != '') HTML = Dcr(d["Cr"]);
		document.body.innerHTML = HTML;
	//} catch(e) {}
}
