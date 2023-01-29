#!/usr/bin/env node
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const marked = require('./Libs/marked.min.js');
const md5 = require('./Libs/md5.min.js');

/* TODO:
   - Hide some items
   - Rich preview
   - Autoredirects
   - Embeds
*/

const HashSize = 6;
const NoScriptNotice = `
<p><b>This page requires JavaScript</b> to work for security reasons.</p>
<p>If you see this message:</p>
<ul>
<li>You may have disabled JavaScript in your browser. If that's the case, you should <b>re-enable it</b>.</li>
<li>Your browser may be outdated and unable to run modern code.</li>
</ul>
<p>Don't worry, as all the code is:</p>
<ul>
<li>Open source: You can review it, by using "View Page Source" or visiting <a href="https://gitlab.com/octospacc/links" target="_blank" rel="noopener">the Git repo</a>.</li>
<li>Free (libre): You don't have to give away your freedom.</li>
</ul>
`;

var BaseHTML = '',
    Items = {},
    OldItems = {};

// https://stackoverflow.com/a/73594511
const walk = (dir, files = []) => {
	const dirFiles = fs.readdirSync(dir);
	for (const f of dirFiles) {
		const stat = fs.lstatSync(dir + path.sep + f)
		if (stat.isDirectory()) {
			walk(dir + path.sep + f, files);
		} else {
			files.push(dir + path.sep + f);
		};
	};
	return files;
};

const TryMkdirSync = Dir => {
	if (!fs.existsSync(Dir)) {
		return fs.mkdirSync(Dir, {recursive:true});
	};
};

const InitItem = _ => {
	let Item = {};
	Item["Alias"] = '';
	Item["Content"] = '';
	return Item;
};

const MakeStrAltern = Str => {
	let New = '';
	for (let i = 0; i < Str.length; i++) {
		if (i % 2 == 0) New += Str[i];
	};
	return New;
};

const FlattenStr = Str => {
	let Flat = '';
	let Lines = Str.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		Flat += Lines[i].trim() + '\n';
	};
	return Flat;
};

const GetTitle = Item => {
	if ("Title" in Item) {
		if (Item["Title"] != '') {
			return '# ' + Item["Title"] + '\n\n';
		} else {
			return '';
		};
	};
};

const GetMatchableContent = Item => {
	if (!"Content" in Item) return;
	let Content = Item["Content"];
	if (Content == '') return;
	if ("Title" in Item) {
		if (Item["Title"] != '') {
			Content = GetTitle(Item) + Content;
		};
	};
	return Content;
};

const GetItemId = Item => {
	if (Item["Id"]) {
		return Item["Id"];
	} else {
		let OldId = GetContentItemId(Item["Content"], OldItems);
		if (OldId) {
			return OldId;
		} else {
			return crypto.randomBytes(HashSize).toString('hex');
		};
	};
};

const GetContentItemId = (Content, From) => {
	if (!From) From = Items;
	let Values = Object.values(From);
	for (let i = 0; i < Values.length; i++) {
		let Item = Values[i];
		if (Content.trim() == Item["Content"].trim()) return Item["Id"];
	};
};

const GetContentHash = (Content, Pad) => {
	let Hash = MakeStrAltern(md5(FlattenStr(Content) + " ".repeat(Pad)).substring(0,HashSize*4));
	//let HashB64 = Buffer.from(Hash, 'hex').toString('base64');
	return Hash;
};

const StoreItem = Item => {
	if (Item["Content"] != '') {
		Item["Alias"] = Item["Alias"].trim();
		Item["Content"] = Item["Content"].trim();
		let Id = GetItemId(Item);
		while (Id in Items) { // If item with same id is already present, retry
			Id = GetItemId(Item);
		};
		//let Pad = 0;
		let Hash = GetContentHash(Item["Content"], 0);
		//while (Hash in Items) { // If item with same hash is already present, retry with pad
		//	Pad++;
		//	Hash = GetContentHash(Item["Content"], Pad);
		//}
		Items[Id] = {
			"Id": Id,
			"Hash": Hash,
			"Visibility": (Item["Visibility"] == 'false' ? false : true),
			"Obfuscation": (Item["Obfuscation"] == 'false' ? false : true),
			"Alias": (Item["Alias"] != '' ? Item["Alias"].split(' ') : []),
			"Title": Item["Title"],
			"Content": Item["Content"],
		};
	};
};

const DoParseFile = Data => {
	let Item = InitItem();
	let ParsedMeta = false;
	let Lines = Data.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		let l = Lines[i];
		let lt = l.trim();
		if (lt.startsWith('# ')) { // Title of new item
			StoreItem(Item); // Store previous item (if exists)
			Item = InitItem();
			ParsedMeta = false;
			Item["Title"] = lt.substring(2);
		} else if (lt.startsWith('// ') && !ParsedMeta) { // Meta line
			let MetaLine = lt.substring(3).toLowerCase();
			['Id','Alias','Visibility','Obfuscation'].forEach(function(i) {
				if (MetaLine.startsWith(i.toLowerCase() + ' ')) {
					Item[i] = MetaLine.substring(i.length+1);
				}
			});
			if (!Lines[i+1].trim().startsWith('// ')) ParsedMeta = true;
		} else {
			Item["Content"] += l + '\n';
		};
	};
	StoreItem(Item); // Store last item
};

const DoHandleFiles = Mode => {
	let Files = walk('Data');
	for (let i = 0; i < Files.length; i++) {
		let File = Files[i].toLowerCase();
		if (File.endsWith('.md') ||  File.endsWith('.markdown')) {
			let Data = fs.readFileSync(Files[i], 'utf8');
			if (Mode == 'Parse') {
				DoParseFile(Data);
			} else if (Mode == 'Patch') {
				fs.writeFileSync(Files[i], DoPatchFile(Data));
			};
		};
	};
};

const FancyEncrypt = Str => {
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

const Init = _ => {
	if (fs.existsSync('Data.json')) {
		OldItems = JSON.parse(fs.readFileSync('Data.json', 'utf8'));
	}
	if (fs.existsSync('Base.html')) {
		BaseHTML = fs.readFileSync('Base.html', 'utf8');
	};
};

const MakeHTMLPage = Item => {
	let Content = Item["Content"].replaceAll('<bittorrent://', '<magnet:?xt=urn:btih:');
	let HTML = marked.parse(GetTitle(Item) + Content);
	return BaseHTML
		.replaceAll('{{NOSCRIPT}}', (Item["Obfuscation"] ? NoScriptNotice : ''))
		.replaceAll('{{TITLE}}', Item["Title"])
		.replaceAll('{{CONTENT}}', (Item["Obfuscation"] ? '' : HTML))
		.replaceAll('{{CONTENTCRYPT}}', (Item["Obfuscation"] ? FancyEncrypt(HTML) : ''));
};

const WriteItem = Item => {
	let Id = Item["Id"];
	let Hash = Item["Hash"];
	let HTML = MakeHTMLPage(Item);
	let Raw = JSON.stringify(Item, null, '\t');
	TryMkdirSync('public/$'+Id);
	fs.writeFileSync('public/$'+Id+'/index.html', HTML);
	fs.writeFileSync('public/$'+Id+'/Data.json', Raw);
	TryMkdirSync('public/!'+Hash);
	fs.writeFileSync('public/!'+Hash+'/index.html', HTML);
	fs.writeFileSync('public/!'+Hash+'/Data.json', Raw);
	Item["Alias"].forEach(function(Alias) {
		TryMkdirSync('public/'+Alias);
		fs.writeFileSync('public/'+Alias+'/index.html', HTML);
		fs.writeFileSync('public/'+Alias+'/Data.json', Raw);
	});
};

const WritePages = _ => {
	Object.values(Items).forEach(function(Item) {
		WriteItem(Item);
	});
};

const DoPatchFile = Data => {
	let IdLine = -1,
	    Content = '',
	    MetaPresent = false,
	    IdPresent = false,
	    ParsedMeta = false;
	let Lines = Data.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		let l = Lines[i];
		let lt = l.trim();
		if (lt.startsWith('# ')) { // New item
			if (IdLine != -1) Lines.splice(IdLine, 0, '// Id ' + GetContentItemId(Content) + '\n');
			IdLine = -1,
			Content = '',
			MetaPresent = false,
			IdPresent = false,
			ParsedMeta = false;
		} else if (lt.startsWith('// ') && !ParsedMeta) { // Meta line
			MetaPresent = true;
			let MetaLine = lt.substring(3).toLowerCase();
			if (MetaLine.startsWith('id ')) IdPresent = true;
			if (!Lines[i+1].trim().startsWith('// ')) ParsedMeta = true;
		} else {
			if (!IdPresent && lt != '') {
				if (MetaPresent) {
					for (let j = i; j > 0; j--) {
						if (Lines[j-1].startsWith('// ')) {
							IdLine = j;
							IdPresent = true;
							break;
						};
					};
				} else {
					IdLine = i;
					IdPresent = true;
				};
			};
			Content += l + '\n';
		};
	};
	if (IdLine != -1) Lines.splice(IdLine, 0, '// Id ' + GetContentItemId(Content) + '\n');
	return Lines.join('\n') + '\n'
};

const MakeItemsList = _ => {
	let List = {};
	Object.values(Items).forEach(function(Item) {
		let Id = Item["Id"];
		List[Id] = {
			"Id": Id,
			"Hash": Item["Hash"],
			"Alias": (Item["Alias"] != '' ? Item["Alias"].split(' ') : []),
			"Title": Item["Title"],
		};
	});
	return List;
};

const Main = _ => {
	Init();
	DoHandleFiles('Parse');
	fs.writeFileSync('Data.json', JSON.stringify(Items, null, '\t'));
	WritePages();
	fs.writeFileSync('public/List.json', JSON.stringify(MakeItemsList(), null, '\t'));
	DoHandleFiles('Patch');
};

Main();
