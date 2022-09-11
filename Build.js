const fs = require('fs');
const path = require('path');
const marked = require('./Libs/marked.min.js');
const md5 = require('./Libs/md5.min.js');
const similarity = require('./Libs/string-similarity.min.js');

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

const FlattenStr = Str => {
	let Flat = '';
	let Lines = Str.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		Flat += Lines[i].trim() + '\n';
	}
	return Flat;
}

const DoHashContent = (Content, Pad) => {
	return MakeBaseHash(FlattenStr(Content) + " ".repeat(Pad));
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
	let Item = {},
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
		} else if (LineTrim.startsWith('// ') && !ParsedMeta) { // Meta line
			let MetaLine = LineTrim.substring(3).toLowerCase();
			if (MetaLine.startsWith('// Alias ')) {
				// Add alias to item dict
			}
			if (!Lines[i+1].trim().startsWith('// ')) { // End of meta lines
				ParsedMeta = true;
			}
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
	if (fs.existsSync('Old.json')){
		OldItems = JSON.parse(fs.readFileSync(Files[i], 'utf8'));
	}
	ParseFiles();
	console.log(Items);
	Object.keys(Items).forEach(function(Key) {
		console.log(Key);
	});
	if (!fs.existsSync('public')){
		fs.mkdirSync('public');
	}
	fs.writeFileSync('public/Data.json', JSON.stringify(Items, null, '\t'));
	fs.writeFileSync('public/Data.min.json', JSON.stringify(Items));
};

Main();
