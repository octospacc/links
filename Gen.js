const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const marked = require('./Libs/marked.min.js');
const md5 = require('./Libs/md5.min.js');
const strsim = require('./Libs/string-similarity.min.js');

/* TODO:
   - Stop using strng similarity
   - Handle duplicated random ids
   - Cleaner JSON
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
    OldItems = {},
    AllItemsContent = [];

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

const TryGetItemId = Item => {
	MakeAllItemsContentList();
	if (AllItemsContent.length == 0) return;
	let Match = strsim.findBestMatch(GetMatchableContent(Item), AllItemsContent).bestMatch.target;
	let Key = FindOldItemsKey(Match);
	if ('Id' in OldItems[Key]) {
		let Id = OldItems[Key]["Id"];
		if (Id != '' && Id != undefined) return Id;
	}
};

const MakeAllItemsContentList = _ => {
	Object.values(OldItems).forEach(function(Item) {
		AllItemsContent = AllItemsContent.concat([GetMatchableContent(Item)]);
	});
	/*
	Object.values(Items).forEach(function(Item) {
		AllItemsContent = AllItemsContent.concat([GetMatchableContent(Item)]);
	});
	*/
	//if (Add) AllItemsContent = AllItemsContent.concat(Add);
};

const FindOldItemsKey = Content => {
	let Keys = Object.keys(OldItems);
	for (let i = 0; i < Keys.length; i++) {
		let Key = Keys[i];
		if (Content == GetMatchableContent(OldItems[Key])) return Key;
	}
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
		let Pad = 0;
		let Hash = GetContentHash(Item["Content"], Pad);
		while (Hash in Items) { // If item with same hash is already present, retry with pad
			Pad++;
			Hash = GetContentHash(Item["Content"], Pad);
		}
		let Id = TryGetItemId(Item);
		if (!Id) Id = crypto.randomBytes(HashSize).toString('hex');
		Items[Hash] = {
			"Id": Id,
			"Hash": Hash,
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
		let l = Lines[i];
		let lt = l.trim();
		if (lt.startsWith('# ')) { // Title of new item
			StoreItem(Item); // Store previous item (if exists)
			Item = InitItem();
			ParsedMeta = false;
			Item["Title"] = lt.substring(2);
		} else if (lt.startsWith('// ') && !ParsedMeta) { // Meta line
			let MetaLine = lt.substring(3).toLowerCase();
			['Id','Alias','Obfuscation'].forEach(function(i) {
				if (MetaLine.startsWith(i.toLowerCase() + ' ')) {
					Item[i] = MetaLine.substring(i.length+1);
				}
			});
			if (!Lines[i+1].trim().startsWith('// ')) { // End of meta lines
				ParsedMeta = true;
			}
		} else {
			Item["Content"] += l + '\n';
		}
	}
	StoreItem(Item); // Store last item
};

const DoHandleFiles = Mode => {
	let Files = walk('Data');
	for (let i = 0; i < Files.length; i++) {
		let File = Files[i].toLowerCase();
		if (File.endsWith('.md') ||  File.endsWith('.markdown')) {
			let Data = fs.readFileSync(Files[i], 'utf8');
			if (Mode == 'Parse') DoParseFile(Data);
			else if (Mode == 'Patch') DoPatchFile(Data);
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
		//MakeAllItemsContentList();
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
	let Id = Items[Key]["Id"];
	let Hash = Items[Key]["Hash"];
	let HTML = MakeHTMLPage(Items[Key]);
	let Raw = JSON.stringify(Items[Key], null, '\t');
	TryMkdirSync('public/@'+Id);
	fs.writeFileSync('public/@'+Id+'/index.html', HTML);
	fs.writeFileSync('public/@'+Id+'/Data.json', Raw);
	TryMkdirSync('public/$'+Hash);
	fs.writeFileSync('public/$'+Hash+'/index.html', HTML);
	fs.writeFileSync('public/$'+Hash+'/Data.json', Raw);
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

const DoPatchFile = Data => {
/*
	//let Item = InitItem();
	let MetaPresent, ParsedMeta, IdPresent = false, false, false;
	let Lines = Data.trim().split('\n');
	for (let i = 0; i < Lines.length; i++) {
		let l = Lines[i];
		let lt = l.trim();

		if (lt.startsWith('# ')) { // Title of new item
			MetaPresent = false;
		} else if (lt == '') {
			continue;	
		} else if (lt.startsWith('// ')) { // Meta line
			MetaPresent = true;
			let MetaLine = lt.substring(3).toLowerCase();
			if (MetaLine.startsWith('id ')) IdPresent = true;
		} else {
			if (!IdPresent) {
				if (MetaPresent) {
					for (let j = i; j = 0; j--) {
						if (Lines[j-1].startsWith('// ')) {
							Lines.splice(j, 0, IdLine)
						}
					}
				} else {
					Lines.splice(i, 0, '// Id '++'\n');
				}
			}
		}

		if (lt.startsWith('# ')) { // Title of new item
			// StoreItem(Item); // Store previous item (if exists)
			//Item = InitItem();
			//ParsedMeta = false;
		} else if (lt.startsWith('// ') && !ParsedMeta) { // Meta line
			let MetaLine = lt.substring(3).toLowerCase();
			['Id'].forEach(function(i) {
				if (MetaLine.startsWith(i.toLowerCase() + ' ')) {
					Item[i] = MetaLine.substring(i.length+1);
				}
			});
			if (!Lines[i+1].trim().startsWith('// ')) { // End of meta lines
				if !Id {
					Lines.splice(i+1, 0, '// Id '+);
				}
				//ParsedMeta = true;
			}
		}
		
	}
	// StoreItem(Item); // Store last item
*/
};

const Main = _ => {
	Init();
	DoHandleFiles('Parse');
	fs.writeFileSync('Data.json', JSON.stringify(Items, null, '\t'));
	WritePages();
	DoHandleFiles('Patch');
};

Main();
