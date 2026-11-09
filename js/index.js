/* ============================================================
   設定は config.json に書く（このファイルは編集しなくてよい）
   JSONなので、次の点に注意する。
     ・文字列は半角のダブルクォート " で囲む
     ・最後の項目のあとにカンマ , を付けない
     ・コメントは書けない

   全体の形:  { "channel": { ... }, "worlds": [ ... ] }

   url が GitHub Releases のファイル（…/releases/latest/download/ファイル名 の形でもよい）なら、ボタンの中に
   ダウンロード数とアップロード日時が、アイコンつきで自動で表示される（設定は不要）。
   ・url は  https://github.com/ユーザー名/リポジトリ名/releases/download/タグ/ファイル名  の形にする
   ・取得には GitHub の公開API を使う（1時間に60回までの制限があるため、10分間はブラウザに保存して再利用する）

   channel : YouTubeチャンネルの案内枠
     name : チャンネル名
     url  : チャンネルのURL（空にするとYouTubeアイコンのボタンが出ない）
     icon : アイコン画像のパス（例: "img/icon.png"）
            空のままなら、チャンネル名の頭文字を丸で表示する
     role : 肩書き（例: "回路配布者"）。名前の横に小さく表示する（空なら出ない）

   worlds : 回路の一覧。1つの回路 = 1つのカード。
   （以下は worlds の中の、1回路分の項目）
   id        : この回路専用リンクの名前。半角の英小文字・数字・ハイフンのみ、
               回路ごとに別の名前にする
               リンクは  配布ページのURL#id  になる（例: .../#farm）
   title     : 回路の名前
   description : 説明文
   downloads : Java版と統合版のうち、あるものだけ書く
               （片方だけの回路なら、もう片方は消してOK）
     version : 「1.21 以降」のように書く
     youtube : そのエディションの解説動画のID（URLの v= の後ろ11文字）
               空欄なら「動画は準備中」と表示される
     contents : ファイルの中身。配列で書く（zipか7zかなど、圧縮形式とは関係ない）
                ["world"]               → ワールド
                ["litematica"]          → Litematica
                ["world", "litematica"] → ワールド＋Litematica
                ボタンの2行目に表示される（省略すると表示されない）
     url     : ダウンロードするファイルへのリンク（1つだけ）
   ============================================================ */
var WORLDS = [];
var CHANNEL = { name: "", url: "", icon: "", role: "" };

/* アイコン（Lucide のパスを使った線画）。svg("名前") でSVG文字列になる */
var ICON_PATHS = {
	download:
		'<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>',
	clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
	link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
	check: '<path d="M20 6 9 17l-5-5"/>',
	play: '<polygon points="6 3 20 12 6 21 6 3"/>',
	globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
	layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
	coffee: '<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>',
	box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
};

function svg(name) {
	return (
		'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
		ICON_PATHS[name] +
		"</svg>"
	);
}

var EDITIONS = [
	{ key: "java", label: "Java版", icon: "coffee" },
	{ key: "bedrock", label: "統合版", icon: "box" },
];

var currentFilter = "all";
var list = document.getElementById("list");
var emptyMessage = document.getElementById("empty");

function el(tag, className, text) {
	var node = document.createElement(tag);
	if (className) {
		node.className = className;
	}
	if (text) {
		node.textContent = text;
	}
	return node;
}

function isVideoId(value) {
	return /^[A-Za-z0-9_-]{11}$/.test(value || "");
}

function buildVideo(world, card, editionKey) {
	var item = world.downloads[editionKey];
	var videoId = item ? item.youtube : "";
	var box = el("div", "video");
	if (!isVideoId(videoId)) {
		box.appendChild(el("div", "soon", "動画は準備中"));
		return box;
	}
	var button = document.createElement("button");
	button.type = "button";
	button.setAttribute("aria-label", "解説動画を再生: " + world.title);
	button.style.backgroundImage =
		"url(https://i.ytimg.com/vi/" + videoId + "/mqdefault.jpg)";
	button.addEventListener("click", function () {
		var frame = document.createElement("iframe");
		frame.src =
			"https://www.youtube-nocookie.com/embed/" +
			videoId +
			"?autoplay=1&rel=0";
		frame.title = world.title + " の解説動画";
		frame.referrerPolicy = "strict-origin-when-cross-origin";
		frame.allow =
			"accelerometer; autoplay; encrypted-media; picture-in-picture";
		frame.allowFullscreen = true;
		box.replaceChild(frame, button);
		card.classList.add("playing");
	});
	box.appendChild(button);
	return box;
}

/* contents（["world", "litematica"] など）を、アイコンつきの小さなラベルにする */
var CONTENT_LABELS = [
	{ key: "world", label: "World", icon: "globe" },
	{ key: "litematica", label: "Litematica", icon: "layers" },
];

function contentsChips(contents) {
	var chips = [];
	if (!Array.isArray(contents)) {
		return chips;
	}
	for (var i = 0; i < CONTENT_LABELS.length; i++) {
		if (contents.indexOf(CONTENT_LABELS[i].key) !== -1) {
			var chip = el("span", "chip");
			chip.innerHTML = svg(CONTENT_LABELS[i].icon);
			chip.appendChild(document.createTextNode(CONTENT_LABELS[i].label));
			chips.push(chip);
		}
	}
	return chips;
}

/* ダウンロードのタイル: エディションのアイコン / 名前 / 中身 / 統計 / ダウンロードの矢印 */
function makeDownload(edition, item) {
	var link = el("a", "dl " + edition.key);
	link.href = item.url;
	link.setAttribute("download", "");
	link.setAttribute(
		"aria-label",
		edition.label + "用のファイルをダウンロード",
	);

	var ico = el("span", "ico");
	ico.innerHTML = svg(edition.icon);

	var text = el("span", "txt");

	/* 1行目: 対応バージョン（左）+ エディション名 */
	var head = el("span", "head");
	head.appendChild(el("b", "", edition.label));
	if (item.version) {
		head.appendChild(el("span", "ver", "ver." + item.version + " 対応"));
	}
	text.appendChild(head);

	/* 2行目: 中身（World / Litematica）。なければ行ごと出さない */
	var chips = contentsChips(item.contents);
	if (chips.length > 0) {
		var meta = el("span", "meta");
		for (var i = 0; i < chips.length; i++) {
			meta.appendChild(chips[i]);
		}
		text.appendChild(meta);
	}

	/* 3行目: GitHub Releases のURLなら、ダウンロード数とアップロード日時。
	   取得できるまで・取得できなかったときは「—」を出す */
	if (releaseRepo(item.url)) {
		var stats = el("span", "dl-stats");
		stats.setAttribute("data-stats-url", item.url);
		stats.appendChild(makeStat("clock", "—", "アップロード日時"));
		stats.appendChild(makeStat("download", "—", "ダウンロード数"));
		text.appendChild(stats);
	}

	var go = el("span", "go");
	go.innerHTML = svg("download");

	link.appendChild(ico);
	link.appendChild(text);
	link.appendChild(go);
	return link;
}

function firstEdition(world) {
	if (currentFilter !== "all" && world.downloads[currentFilter]) {
		return currentFilter;
	}
	for (var i = 0; i < EDITIONS.length; i++) {
		if (world.downloads[EDITIONS[i].key]) {
			return EDITIONS[i].key;
		}
	}
	return "";
}

function buildCard(world) {
	var card = el("article", "card");
	card.id = world.id;
	if (location.hash.slice(1) === world.id) {
		card.classList.add("target");
	}

	var selected = firstEdition(world);
	var video = buildVideo(world, card, selected);
	card.appendChild(video);

	var body = el("div", "body");

	/* タイトル + リンクのコピー（アイコンだけのボタン） */
	var row = el("div", "title-row");
	row.appendChild(el("h2", "", world.title));
	var copy = el("button", "copy");
	copy.type = "button";
	copy.setAttribute("aria-label", "この回路のリンクをコピー");
	copy.title = "リンクをコピー";
	copy.innerHTML = svg("link");
	copy.addEventListener("click", function () {
		copyLink(world.id, copy);
	});
	row.appendChild(copy);
	body.appendChild(row);
	body.appendChild(el("p", "", world.description));

	/* 解説動画の切り替え（Java版 / 統合版） */
	var picker = el("div", "picker");
	var pickerLabel = el("span", "picker-label");
	pickerLabel.innerHTML = svg("play");
	pickerLabel.appendChild(document.createTextNode("解説動画"));
	picker.appendChild(pickerLabel);
	var tabGroup = el("span", "tabs");
	picker.appendChild(tabGroup);
	var tabs = [];

	function selectEdition(key) {
		selected = key;
		for (var t = 0; t < tabs.length; t++) {
			var isOn = tabs[t].getAttribute("data-edition") === key;
			tabs[t].setAttribute("aria-pressed", isOn ? "true" : "false");
		}
		var next = buildVideo(world, card, key);
		card.replaceChild(next, video);
		video = next;
		card.classList.remove("playing");
	}

	function makeTab(edition) {
		var tab = el("button", "badge " + edition.key, edition.label);
		tab.type = "button";
		tab.setAttribute("data-edition", edition.key);
		tab.setAttribute(
			"aria-pressed",
			edition.key === selected ? "true" : "false",
		);
		tab.addEventListener("click", function () {
			selectEdition(edition.key);
		});
		return tab;
	}

	var downloads = el("div", "downloads");
	for (var i = 0; i < EDITIONS.length; i++) {
		var edition = EDITIONS[i];
		var item = world.downloads[edition.key];
		if (!item) {
			continue;
		}
		var tab = makeTab(edition);
		tabs.push(tab);
		tabGroup.appendChild(tab);
		if (currentFilter !== "all" && currentFilter !== edition.key) {
			continue;
		}
		if (item.url) {
			downloads.appendChild(makeDownload(edition, item));
		}
	}

	body.appendChild(picker);
	body.appendChild(downloads);
	card.appendChild(body);
	return card;
}

function render() {
	list.textContent = "";
	var shown = 0;
	for (var i = 0; i < WORLDS.length; i++) {
		var world = WORLDS[i];
		if (currentFilter === "all" || world.downloads[currentFilter]) {
			list.appendChild(buildCard(world));
			shown++;
		}
	}
	if (shown === 0) {
		emptyMessage.textContent = "このエディションの回路はまだありません。";
	}
	emptyMessage.hidden = shown > 0;
	applyStats();
}

var buttons = document.querySelectorAll(".filter button");

function setFilter(value) {
	currentFilter = value;
	for (var k = 0; k < buttons.length; k++) {
		var pressed = buttons[k].getAttribute("data-filter") === value;
		buttons[k].setAttribute("aria-pressed", pressed ? "true" : "false");
	}
	render();
}

for (var b = 0; b < buttons.length; b++) {
	buttons[b].addEventListener("click", function () {
		setFilter(this.getAttribute("data-filter"));
	});
}

function copyLink(id, button) {
	var url = location.href.split("#")[0] + "#" + id;
	function done() {
		button.innerHTML = svg("check");
		button.classList.add("done");
		button.title = "コピーしました";
		setTimeout(function () {
			button.innerHTML = svg("link");
			button.classList.remove("done");
			button.title = "リンクをコピー";
		}, 1600);
	}
	function fallback() {
		window.prompt("このリンクをコピーしてください", url);
	}
	if (navigator.clipboard && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(url).then(done, fallback);
	} else {
		fallback();
	}
}

/* URLの # の後ろ（例: #farm）に合う回路があれば、そのカードまで移動して強調する */
function showTarget() {
	var id = location.hash.slice(1);
	if (!id) {
		return;
	}
	var world = null;
	for (var i = 0; i < WORLDS.length; i++) {
		if (WORLDS[i].id === id) {
			world = WORLDS[i];
		}
	}
	if (!world) {
		return;
	}
	if (currentFilter !== "all" && !world.downloads[currentFilter]) {
		setFilter("all");
	} else {
		render();
	}
	var card = document.getElementById(id);
	if (card) {
		card.scrollIntoView({ block: "center" });
	}
}

/* ---------- GitHub Releases の アップロード日時 / ダウンロード数 ---------- */
var STATS = {};
var STATS_BY_FILE = {};
var STATS_ERRORS = {};
var STATS_TTL = 10 * 60 * 1000;

/* GitHub Releases のURLなら "ユーザー名/リポジトリ名" を返す。それ以外は空文字。
   .../releases/download/タグ/ファイル名 と .../releases/latest/download/ファイル名 の両方に対応 */
function releaseRepo(url) {
	var m =
		/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/(?:download\/[^/]+|latest\/download)\//.exec(
			url || "",
		);
	if (!m) {
		return "";
	}
	return m[1] + "/" + m[2];
}

/* USERNAME のままの仮のURLは、GitHubに問い合わせない */
function isPlaceholderRepo(repo) {
	return repo.split("/")[0] === "USERNAME";
}

/* URLが完全に一致しなくても（タグ違い・latest など）、ファイル名で探せるようにする */
function fileKey(url) {
	var name = String(url).split("#")[0].split("?")[0].split("/").pop();
	return releaseRepo(url).toLowerCase() + "/" + normalizeUrl(name);
}

/* 日本語のファイル名などが %E3... と書かれていても突き合わせられるように、そろえる */
function normalizeUrl(url) {
	try {
		return decodeURIComponent(url).toLowerCase();
	} catch (error) {
		return String(url).toLowerCase();
	}
}

function readCache(key, allowStale) {
	try {
		var saved = JSON.parse(localStorage.getItem(key));
		if (saved && (allowStale || Date.now() - saved.time < STATS_TTL)) {
			return saved.data;
		}
	} catch (error) {
		/* 保存が使えない環境では、毎回取りに行く */
	}
	return null;
}

function writeCache(key, data) {
	try {
		localStorage.setItem(
			key,
			JSON.stringify({ time: Date.now(), data: data }),
		);
	} catch (error) {
		/* 保存できなくても動作には影響しない */
	}
}

function fetchAssets(repo) {
	var key = "assets:" + repo;
	var cached = readCache(key, false);
	if (cached) {
		return Promise.resolve(cached);
	}
	return fetch(
		"https://api.github.com/repos/" + repo + "/releases?per_page=100",
		{
			headers: { Accept: "application/vnd.github+json" },
		},
	)
		.then(function (response) {
			if (!response.ok) {
				throw new Error("GitHub API: HTTP " + response.status);
			}
			return response.json();
		})
		.then(function (releases) {
			var assets = [];
			for (var i = 0; i < releases.length; i++) {
				var files = releases[i].assets || [];
				for (var k = 0; k < files.length; k++) {
					assets.push({
						url: files[k].browser_download_url,
						count: files[k].download_count,
						uploaded: files[k].created_at,
					});
				}
			}
			writeCache(key, assets);
			return assets;
		})
		.catch(function (error) {
			var stale = readCache(key, true);
			if (stale) {
				return stale;
			}
			throw error;
		});
}

function pad2(n) {
	return n < 10 ? "0" + n : String(n);
}

function formatDateTime(iso) {
	var d = new Date(iso);
	if (isNaN(d.getTime())) {
		return "";
	}
	return (
		d.getFullYear() +
		"/" +
		pad2(d.getMonth() + 1) +
		"/" +
		pad2(d.getDate()) +
		" " +
		pad2(d.getHours()) +
		":" +
		pad2(d.getMinutes())
	);
}

/* アイコン + 値の小さな表示（読み上げ用の説明つき） */
function makeStat(iconName, value, label) {
	var stat = el("span", "stat");
	stat.title = label;
	stat.innerHTML = svg(iconName);
	stat.appendChild(el("span", "sr-only", label + " "));
	stat.appendChild(document.createTextNode(value));
	return stat;
}

/* 画面上の統計欄に、取得できた値を入れる */
function applyStats() {
	var boxes = document.querySelectorAll("[data-stats-url]");
	for (var i = 0; i < boxes.length; i++) {
		var url = boxes[i].getAttribute("data-stats-url");
		var stat = STATS[normalizeUrl(url)] || STATS_BY_FILE[fileKey(url)];
		if (!stat) {
			boxes[i].title = STATS_ERRORS[releaseRepo(url)] || "";
			continue;
		}
		boxes[i].title = "";
		boxes[i].textContent = "";
		var when = formatDateTime(stat.uploaded);
		if (when) {
			boxes[i].appendChild(makeStat("clock", when, "アップロード日時"));
		}
		boxes[i].appendChild(
			makeStat(
				"download",
				stat.count.toLocaleString("ja-JP"),
				"ダウンロード数",
			),
		);
	}
}

function loadStats() {
	var repos = [];
	for (var i = 0; i < WORLDS.length; i++) {
		for (var key in WORLDS[i].downloads) {
			var repo = releaseRepo(WORLDS[i].downloads[key].url);
			if (
				repo &&
				!isPlaceholderRepo(repo) &&
				repos.indexOf(repo) === -1
			) {
				repos.push(repo);
			}
		}
	}
	repos.forEach(function (repo) {
		fetchAssets(repo)
			.then(function (assets) {
				for (var n = 0; n < assets.length; n++) {
					STATS[normalizeUrl(assets[n].url)] = assets[n];
					var byFile = fileKey(assets[n].url);
					if (!STATS_BY_FILE[byFile]) {
						STATS_BY_FILE[byFile] = assets[n];
					}
				}
				applyStats();
			})
			.catch(function (error) {
				/* 取得できなくてもページは普通に使える（統計は「—」のままになる） */
				console.warn(repo + ": " + error.message);
				STATS_ERRORS[repo] =
					"取得できませんでした（" + error.message + "）";
				applyStats();
			});
	});
}

function applyChannel() {
	var box = document.getElementById("owner");
	if (!CHANNEL.name && !CHANNEL.url) {
		box.hidden = true;
		return;
	}
	var name = CHANNEL.name || "";

	var avatar = document.getElementById("channelAvatar");
	avatar.textContent = "";
	if (CHANNEL.icon) {
		var image = document.createElement("img");
		image.src = CHANNEL.icon;
		image.alt = "";
		avatar.appendChild(image);
	} else {
		avatar.textContent = name.slice(0, 1);
	}
	document.getElementById("channelName").textContent = name;

	var role = document.getElementById("channelRole");
	role.textContent = CHANNEL.role || "";
	role.hidden = !CHANNEL.role;

	/* URLの @ハンドル名 を取り出して表示する */
	var handle = /@([^/?#]+)/.exec(CHANNEL.url || "");
	document.getElementById("channelHandle").textContent = handle
		? "@" + handle[1]
		: "";

	var link = document.getElementById("channelLink");
	if (CHANNEL.url) {
		link.href = CHANNEL.url;
		link.hidden = false;
	} else {
		link.hidden = true;
	}
	box.hidden = false;
}

function showLoadError() {
	emptyMessage.textContent =
		"回路の一覧（config.json）を読み込めませんでした。ファイルを直接開いている場合は、公開したURLで開いてください。";
	emptyMessage.hidden = false;
}

function loadConfig() {
	fetch("config.json")
		.then(function (response) {
			if (!response.ok) {
				throw new Error("HTTP " + response.status);
			}
			return response.json();
		})
		.then(function (data) {
			if (!data || !Array.isArray(data.worlds)) {
				throw new Error('config.json の "worlds" は配列にしてください');
			}
			WORLDS = data.worlds;
			CHANNEL = data.channel || CHANNEL;
			applyChannel();
			render();
			showTarget();
			loadStats();
		})
		.catch(function (error) {
			console.error(error);
			showLoadError();
		});
}

window.addEventListener("hashchange", showTarget);
loadConfig();
