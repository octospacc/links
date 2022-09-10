const fs = require('fs');
const path = require('path');
const marked = require('./marked.min.js');
const md5 = require('./md5.min.js');

// Hash formats:
// Base: md5 string //truncated to 24 chars (12 bytes)
// Base64: Base hash converted to base64 and alternated + prepend "!" (final 9 chars)

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
	let Hash = md5(Data)//.substring(0,24);
	//console.log(Hash);
	return Hash;
}

const DoHashContent = (Content, Append) => {
	let Clean = '';
	let Lines = Content.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		Clean += Lines[i].trim() + '\n';
	}
	Clean += Append;
	return MakeBaseHash(Clean);
}

const StoreItem = (Content, Title) => {
	let Items = {};
	if (Content != '') {
		Items[DoHashContent(Content)] = {
			"Title": Title,
			"Content": Content
		};
	}
	return Items;
}

const DoParseFile = Data => {
	let Hash = '',
	    Title = '',
	    Content = ''
	    Items = {};
	let FoundItem = false,
	    ParsedMeta = false;
	let Lines = Data.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		let Line = Lines[i];
		let LineTrim = Line.trim();
		if (LineTrim.startsWith('# ')) { // Title of new item
			//Hash = TryHashContent(Content); // Store previous item
			Object.assign(Items, StoreItem(Content.trim(), Title));
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
	//Hash = TryHashContent(Content); // Store last item
	Object.assign(Items, StoreItem(Content.trim(), Title));
	return Items;
};

const ParseFiles = _ => {
	let Items = {};
	let Files = walk('Data');
	for (let i = 0; i < Files.length; i++) {
		let File = Files[i].toLowerCase();
		if (File.endsWith('.md') ||  File.endsWith('.markdown')) {
			fs.readFile(Files[i], 'utf8', (Err, Data) => {
				if (Err) {
					console.error(Err);
					return;
				}
				Object.assign(Items, DoParseFile(Data));
				//console.log(Data);
				//console.log(marked.parse(Data));
			});
		}
	}
	return Items;
}



const Main = _ => {
	let Items = {};
	Items = ParseFiles();
	console.log(Items);
};

Main();
