// SPDX-License-Identifier: CC-BY-SA-4.0

function Dcr (cr) {
	var chs = cr.split('').reverse();
	for (var i = 0; i < chs.length; i++) {
		var c = chs[i];
		if (!isNaN(c)) chs[i] = Math.abs(c-9);
		else if (c == '#') chs[i] = '=';
		else if (c == c.toLowerCase()) chs[i] = c.toUpperCase();
		else if (c == c.toUpperCase()) chs[i] = c.toLowerCase();
	}
	return atob(chs.join(''));
}

function Ste (e) {
	document.body.innerHTML = ('<h1>Error</h1><p>' + e + '</p>');
}

function Init (d) {
	if (d.np) {
		d.cr = true;
	}
	if (d.cr) {
		var cpt = (JSON.parse(sessionStorage.getItem(Gdo.k)) || {}).cpt;
		var ms = (cpt ? 300 : 800);
		document.body.innerHTML = ('<h1>' + document.title + '</h1>' + Dcr(Gdo.cpt));
		var int = document.body.querySelector('button');
		int.onclick = (function(){
			this.disabled = !this.dprop;
			sessionStorage.setItem(Gdo.k, JSON.stringify({ cpt: 1 }));
			setTimeout(function(){
				if (d.np) {
					document.body.innerHTML = ('<h1>' + document.title + '</h1>' + '<p>' + 'Loading...' + '</p>');
					fetch('./Data.json')
						.then(function(response){
							response.json().then(function(d){
								document.body.innerHTML = d.Html;
							}).catch(Ste);
						}).catch(Ste);
				} else {
					document.body.innerHTML = Dcr(d.cr);
				}
			}, ms);
		});
		if (cpt) int.onclick();
	}
}
