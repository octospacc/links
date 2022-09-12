const fs = require('fs');
const path = require('path');
const marked = require('./Libs/marked.min.js');
const md5 = require('./Libs/md5.min.js');
const strsim = require('./Libs/string-similarity.min.js');

var Items = {},
    OldItems = {},
    OldItemsContent = [];

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

const InitItem = _ => {
	let Item = {};
	Item["Alias"] = '';
	Item["Content"] = '';
	return Item;
}

const MakeStrAltern = Str => {
	let New = '';
	for (let i = 0; i < Str.length; i++) {
		if (i % 2 == 0) {
			New += Str[i];
		}
	}
	return New;
}

const FlattenStr = Str => {
	let Flat = '';
	let Lines = Str.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		Flat += Lines[i].trim() + '\n';
	}
	return Flat;
}

const GetMatchableContent = Item => {
	if (!"Content" in Item) return;
	let Content = Item["Content"];
	if (Content == '') return;
	if ("Title" in Item) {
		if (Item["Title"] != '') {
			Content = '# ' + Item["Title"] + '\n\n' + Content;
		}
	}
	return Content;
}

const FindPermaHash = Item => {
	let Match = strsim.findBestMatch(GetMatchableContent(Item), OldItemsContent).bestMatch.target;
	let Key = FindOldItemsKey(Match);
	console.log(Match, Key)
	if ("PermaHash" in OldItems[Key]) {
		let PermaHash = OldItems[Key]["PermaHash"];
		if (PermaHash != '') return PermaHash;
	}
	return Key;
}

const MakeOldItemsContentList = _ => {
	Object.values(OldItems).forEach(function(Item) {
		OldItemsContent = OldItemsContent.concat([GetMatchableContent(Item)]);
	/*
		if (!"Content" in OldItems[Key]) {
			return;
		}
		let Str = OldItems[Key]["Content"];
		if (Str == '') {
			return;
		}
		if ("Title" in OldItems[Key]) {
			Str = '# ' + OldItems[Key]["Title"] + '\n\n' + Str;
		}
		OldItemsContent = OldItemsContent.concat([Str]);
	*/
	});
}

const FindOldItemsKey = Content => {
	//let Key;
	let Keys = Object.keys(OldItems);
	for (let i = 0; i < Keys.length; i++) {
		let Key = Keys[i];
		if (Content == GetMatchableContent(OldItems[Key])) return Key;
	}
	/*Object.keys(OldItems).forEach(function(Key) {
		if (Content == GetMatchableContent(OldItems[Key])) return Key;
	});*/
}

const GetContentHash = (Content, Pad) => {
	let Hash = MakeStrAltern(md5(FlattenStr(Content) + " ".repeat(Pad)).substring(0,24));
	//let HashB64 = Buffer.from(Hash, 'hex').toString('base64');
	return Hash;
}

const StoreItem = Item => {
	if (Item["Content"] != '') {
		Item["Alias"] = Item["Alias"].trim();
		Item["Content"] = Item["Content"].trim();
		let Pad = 0;
		let Hash = GetContentHash(Item["Content"], Pad);
		while (Hash in Items) { // If item with same hash is already present, retry with pad
			Pad++;
			Hash = GetContentHash(Item["Content"], Pad);
		}
		Items[Hash] = {
			"PermaHash": FindPermaHash(Item), // Find most similar content string in all old items, get permahash if present else hash
			"Alias": ((Item["Alias"] != '') ? Item["Alias"].split(' ') : []), // Alias strings to reach the content alternatively to the content hash
			"Title": Item["Title"],
			"Content": Item["Content"],
			"HTML": marked.parse(Item["Content"])
		};
	}
}

const DoParseFile = Data => {
	let Item = InitItem();
	let ParsedMeta = false;
	let Lines = Data.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		let Line = Lines[i];
		let LineTrim = Line.trim();
		if (LineTrim.startsWith('# ')) { // Title of new item
			StoreItem(Item); // Store previous item (if exists)
			Item = InitItem();
			Item["Title"] = LineTrim.substring(2);
		} else if (LineTrim.startsWith('// ') && !ParsedMeta) { // Meta line
			let MetaLine = LineTrim.substring(3).toLowerCase();
			['Alias'].forEach(function(i) {
				if (MetaLine.startsWith(i.toLowerCase() + ' ')) {
					Item[i] = MetaLine.substring(i.length+1);
				}
			});
			if (!Lines[i+1].trim().startsWith('// ')) { // End of meta lines
				ParsedMeta = true;
			}
		} else {
			Item["Content"] += Line + '\n';
		}
	}
	StoreItem(Item); // Store last item
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
	if (fs.existsSync('Data.json')){
		OldItems = JSON.parse(fs.readFileSync('Data.json', 'utf8'));
		MakeOldItemsContentList();
		console.log(OldItems)
	}
	ParseFiles();
	console.log(Items);
	Object.keys(Items).forEach(function(Key) {
		//console.log(Key);
	});
	//if (!fs.existsSync('public')){
	//	fs.mkdirSync('public');
	//}
	fs.writeFileSync('Data.json', JSON.stringify(Items, null, '\t'));
	fs.writeFileSync('Data.min.json', JSON.stringify(Items));
};

Main();
