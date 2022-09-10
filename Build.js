var fs = require('fs');
var path = require('path');
var marked = require('./marked.min.js');

var Items = {};

// https://stackoverflow.com/a/73594511
const walk = (dir, files = []) => {
	const dirFiles = fs.readdirSync(dir);
	for (const f of dirFiles) {
		const stat = fs.lstatSync(dir + path.sep + f)
		if (stat.isDirectory()) {
			walk(dir + path.sep + f, files);
		} else {
			files.push(dir + path.sep + f);
		}
	}
	return files;
};

const ParseFile = Data => {
	let Lines = Data.split('\n');
	let Hash = '',
	    Title = '',
	    Content = '';
	let FoundItem = false,
	    ParsedMeta = false;
	for (let i = 0; i < Lines.lenght; i++) {
		let Line = Lines[i];
		let LineTrim = Line.trim();
		if (LineTrim.startsWith("# ")) {
			Title = LineTrim.substring(2);
		} else if (LineTrim.startsWith("// ") and !ParsedMeta) {
			if (!Lines[i+1].trim().startsWith("// ")) {
				ParsedMeta = true;
			}
		} else {
			Content += Line + '\n';
		}
	}
};

const Main = _ => {
	let Files = walk('Data');
	for (let i = 0; i < Files.length; i++) {
		let File = Files[i].toLowerCase();
		if (File.endsWith('.md') ||  File.endsWith('.markdown')) {
			fs.readFile(Files[i], 'utf8', (Err, Data) => {
				if (Err) {
					console.error(Err);
					return;
				}
				console.log(Data);
				console.log(marked.parse(Data));
			});
		}
	}
};

Main();
