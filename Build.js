const fs = require('fs');
const path = require('path');
const marked = require('./marked.min.js');
const md5 = require('./md5.min.js');

var Items = {},
    OldItems = {};

// Hash formats:
// Base: md5 string truncated to 24 chars and alternated (final 6 bytes)
// Base64: Base hash converted to base64 + prepend "!" (final 9 chars)

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

const MakeStrAltern = Str => {
	let New = '';
	for (let i = 0; i < Str.length; i++) {
		if (i % 2 == 0) {
			New += Str[i];
		}
	}
	return New;
}

const MakeBaseHash = Data => {
	//let Hash = MakeStrAltern(Buffer.from(md5(Data).substring(0,24), 'hex').toString('base64'));
	let Hash = MakeStrAltern(md5(Data).substring(0,24));
	return Hash;
}

const DoHashContent = (Content, Pad) => {
	let Clean = '';
	let Lines = Content.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		Clean += Lines[i].trim() + '\n';
	}
	Clean += " ".repeat(Pad);
	return MakeBaseHash(Clean);
}

const StoreItem = (Content, Title) => {
	if (Content != '') {
		let Pad = 0;
		let Hash = DoHashContent(Content, Pad);
		while (Hash in Items) { // If item with same hash is already present, retry with pad
			Pad++;
			Hash = DoHashContent(Content, Pad);
		}
		Items[Hash] = {
			"Title": Title,
			"Content": Content,
			"HTML": marked.parse(Content)
		};
	}
}

const DoParseFile = Data => {
	let Hash = '',
	    Title = '',
	    Content = '';
	let FoundItem = false,
	    ParsedMeta = false;
	let Lines = Data.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		let Line = Lines[i];
		let LineTrim = Line.trim();
		if (LineTrim.startsWith('# ')) { // Title of new item
			StoreItem(Content.trim(), Title); // Store previous item (if exists)
			Title = LineTrim.substring(2);
		/*
		} else if (LineTrim.startsWith('// ') and !ParsedMeta) { // Meta line
			let MetaLine = LineTrim.substring(3);
			if (!Lines[i+1].trim().startsWith('// ')) { // End of meta lines
				ParsedMeta = true;
			}
		*/
		} else {
			Content += Line + '\n';
		}
	}
	StoreItem(Content.trim(), Title); // Store last item
};

const ParseFiles = _ => {
	let Files = walk('Data');
	for (let i = 0; i < Files.length; i++) {
		let File = Files[i].toLowerCase();
		if (File.endsWith('.md') ||  File.endsWith('.markdown')) {
			let Data = fs.readFileSync(Files[i], 'utf8');
			DoParseFile(Data);
		}
	}
}

const Main = _ => {
	ParseFiles();
	console.log(Items);
	Object.keys(Items).forEach(function(Key) {
		console.log(Key);
	});
};

Main();
