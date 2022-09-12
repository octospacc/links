const fs = require('fs');
const path = require('path');
const marked = require('./Libs/marked.min.js');
const md5 = require('./Libs/md5.min.js');
const strsim = require('./Libs/string-similarity.min.js');

/* TODO:
   - Redirects
*/

var BaseHTML = '',
    Items = {},
    OldItems = {},
    OldItemsContent = [];

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

const TryMkdirSync = Dir => {
	if (!fs.existsSync(Dir)) {
		fs.mkdirSync(Dir, {recursive:true});
	}
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
	}
	return New;
};

const FlattenStr = Str => {
	let Flat = '';
	let Lines = Str.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		Flat += Lines[i].trim() + '\n';
	}
	return Flat;
};

const GetTitle = Item => {
	if ("Title" in Item) {
		if (Item["Title"] != '') {
			return '# ' + Item["Title"] + '\n\n';
		} else {
			return '';
		}
	}
};

const GetMatchableContent = Item => {
	if (!"Content" in Item) return;
	let Content = Item["Content"];
	if (Content == '') return;
	if ("Title" in Item) {
		if (Item["Title"] != '') {
			Content = GetTitle(Item) + Content;
		}
	}
	return Content;
};

const FindPermaHash = Item => {
	if (OldItemsContent.length == 0) return;
	let Match = strsim.findBestMatch(GetMatchableContent(Item), OldItemsContent).bestMatch.target;
	let Key = FindOldItemsKey(Match);
	if ("PermaHash" in OldItems[Key]) {
		let PermaHash = OldItems[Key]["PermaHash"];
		if (PermaHash != '') return PermaHash;
	}
	return Key;
};

const MakeOldItemsContentList = _ => {
	Object.values(OldItems).forEach(function(Item) {
		OldItemsContent = OldItemsContent.concat([GetMatchableContent(Item)]);
	});
};

const FindOldItemsKey = Content => {
	let Keys = Object.keys(OldItems);
	for (let i = 0; i < Keys.length; i++) {
		let Key = Keys[i];
		if (Content == GetMatchableContent(OldItems[Key])) return Key;
	}
};

const GetContentHash = (Content, Pad) => {
	let Hash = MakeStrAltern(md5(FlattenStr(Content) + " ".repeat(Pad)).substring(0,24));
	//let HashB64 = Buffer.from(Hash, 'hex').toString('base64');
	return Hash;
};

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
		let PermaHash = FindPermaHash(Item);
		if (!PermaHash) PermaHash = Hash;
		Items[Hash] = {
			"PermaHash": PermaHash,
			"Obfuscation": (Item["Obfuscation"] == 'false' ? false : true),
			"Alias": (Item["Alias"] != '' ? Item["Alias"].split(' ') : []),
			"Title": Item["Title"],
			"Content": Item["Content"],
		};
	}
};

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
			ParsedMeta = false;
			Item["Title"] = LineTrim.substring(2);
		} else if (LineTrim.startsWith('// ') && !ParsedMeta) { // Meta line
			let MetaLine = LineTrim.substring(3).toLowerCase();
			['Alias','Obfuscation'].forEach(function(i) {
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
	}
	return Chars.join('');
};

const Init = _ => {
	if (fs.existsSync('Data.json')) {
		OldItems = JSON.parse(fs.readFileSync('Data.json', 'utf8'));
		MakeOldItemsContentList();
	}
	if (fs.existsSync('Base.html')) {
		BaseHTML = fs.readFileSync('Base.html', 'utf8');
	}
};

const MakeHTMLPage = Item => {
	let Content = Item["Content"].replaceAll('<bittorrent://', '<magnet:?xt=urn:btih:');
	let HTML = marked.parse(GetTitle(Item) + Content);
	return BaseHTML
		.replaceAll('{{NOSCRIPT}}', (Item["Obfuscation"] ? NoScriptNotice : ''))
		.replaceAll('{{TITLE}}', Item["Title"])
		.replaceAll('{{CONTENT}}', (Item["Obfuscation"] ? '' : HTML))
		//.replaceAll('{{CONTENTB64}}', btoa(HTML))
		.replaceAll('{{CONTENTCRYPT}}', (Item["Obfuscation"] ? FancyEncrypt(HTML) : ''));
};

const WriteItem = Key => {
	let PermaHash = Items[Key]["PermaHash"];
	let HTML = MakeHTMLPage(Items[Key]);
	let Raw = JSON.stringify(Items[Key], null, '\t');
	TryMkdirSync('public/@'+PermaHash);
	fs.writeFileSync('public/@'+PermaHash+'/index.html', HTML);
	fs.writeFileSync('public/@'+PermaHash+'/Data.json', Raw);
	TryMkdirSync('public/$'+Key);
	fs.writeFileSync('public/$'+Key+'/index.html', HTML);
	fs.writeFileSync('public/$'+Key+'/Data.json', Raw);
	Items[Key]["Alias"].forEach(function(Alias) {
		TryMkdirSync('public/'+Alias);
		fs.writeFileSync('public/'+Alias+'/index.html', HTML);
		fs.writeFileSync('public/'+Alias+'/Data.json', Raw);
	});
};

const WritePages = _ => {
	Object.keys(Items).forEach(function(Key) {
		WriteItem(Key);
	});
};

const Main = _ => {
	Init();
	ParseFiles();
	fs.writeFileSync('Data.json', JSON.stringify(Items, null, '\t'));
	WritePages();
};

Main();
