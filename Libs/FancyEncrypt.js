module.exports = Str => {
	Str = btoa(Str);
	let Chars = Str.split('').reverse();
	for (let i = 0; i < Chars.length; i++) {
		let c = Chars[i];
		if (!isNaN(c)) Chars[i] = Math.abs(c-9);
		else if (c == '=') Chars[i] = '#';
		else if (c == c.toLowerCase()) Chars[i] = c.toUpperCase();
		else if (c == c.toUpperCase()) Chars[i] = c.toLowerCase();
	};
	return Chars.join('');
};
