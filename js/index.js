/* ============================================================
   設定は config.json に書く（このファイルは編集しなくてよい）
   JSONなので、次の点に注意する。
     ・文字列は半角のダブルクォート " で囲む
     ・最後の項目のあとにカンマ , を付けない
     ・コメントは書けない

   全体の形:  { "channel": { ... }, "worlds": [ ... ] }

   url が GitHub Releases のファイルなら、ボタンの下に
   アップロード日時とダウンロード数が自動で表示される（設定は不要）。
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

var DOWNLOAD_ICON =
	'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="M7 11l5 5 5-5"/><path d="M5 20h14"/></svg>';

var EDITIONS = [
	{ key: "java", label: "Java版" },
	{ key: "bedrock", label: "統合版" },
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

/* contents（["world", "litematica"] など）を、ボタンに出す文字にする */
var CONTENT_LABELS = [
	{ key: "world", label: "World" },
	{ key: "litematica", label: "Litematica" },
];

function contentsLabel(contents) {
	if (!Array.isArray(contents)) {
		return "";
	}
	var names = [];
	for (var i = 0; i < CONTENT_LABELS.length; i++) {
		if (contents.indexOf(CONTENT_LABELS[i].key) !== -1) {
			names.push(CONTENT_LABELS[i].label);
		}
	}
	return names.join("＋");
}

function makeDownload(kind, title, notes, url) {
	var link = el("a", "dl " + kind);
	link.href = url;
	link.setAttribute("download", "");
	var icon = el("span", "ico");
	icon.innerHTML = DOWNLOAD_ICON;
	var text = el("span", "txt");
	text.appendChild(el("b", "", title));
	var small = el("small");
	for (var n = 0; n < notes.length; n++) {
		if (notes[n]) {
			small.appendChild(el("span", "", notes[n]));
		}
	}
	text.appendChild(small);
	link.appendChild(icon);
	link.appendChild(text);
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
	var row = el("div", "title-row");
	row.appendChild(el("h2", "", world.title));
	var copy = el("button", "copy", "リンクをコピー");
	copy.type = "button";
	copy.addEventListener("click", function () {
		copyLink(world.id, copy);
	});
	body.appendChild(row);
	body.appendChild(el("p", "", world.description));

	/* 解説動画の切り替え（Java版 / 統合版） */
	var picker = el("div", "picker");
	picker.appendChild(el("span", "picker-label", "解説動画"));
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
		picker.appendChild(tab);
		if (currentFilter !== "all" && currentFilter !== edition.key) {
			continue;
		}
		if (item.url) {
			var cell = el("div", "dl-cell");
			cell.appendChild(
				makeDownload(
					edition.key,
					edition.label + "をダウンロード",
					[
						contentsLabel(item.contents),
						"ver." + item.version + "対応",
					],
					item.url,
				),
			);
			/* GitHub Releases のURLなら、アップロード日時とダウンロード数を出す欄を作る */
			if (releaseRepo(item.url)) {
				var stats = el("div", "dl-stats");
				stats.setAttribute("data-stats-url", item.url);
				cell.appendChild(stats);
			}
			downloads.appendChild(cell);
		}
	}

	/* 「リンクをコピー」は、切り替えボタンと同じ行の右端に置く */
	picker.appendChild(copy);
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
		button.textContent = "コピーしました";
		setTimeout(function () {
			button.textContent = "リンクをコピー";
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
var STATS_TTL = 10 * 60 * 1000;

/* URLの形が合っていなければ空文字を返す。USERNAME のままの仮のURLも対象外にする */
function releaseRepo(url) {
	var m =
		/^https:\/\/github\.com\/([^/]+)\/([^/]+)\/releases\/download\//.exec(
			url || "",
		);
	if (!m || m[1] === "USERNAME") {
		return "";
	}
	return m[1] + "/" + m[2];
}

/* 日本語のファイル名などが %E3... と書かれていても突き合わせられるように、そろえる */
function normalizeUrl(url) {
	try {
		return decodeURIComponent(url).toLowerCase();
	} catch (error) {
		return String(url).toLowerCase();
	}
}

function readCache(key) {
	try {
		var saved = JSON.parse(localStorage.getItem(key));
		if (saved && Date.now() - saved.time < STATS_TTL) {
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
	var cached = readCache(key);
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

/* 画面上の統計欄に、取得できた値を入れる */
function applyStats() {
	var boxes = document.querySelectorAll("[data-stats-url]");
	for (var i = 0; i < boxes.length; i++) {
		var stat = STATS[normalizeUrl(boxes[i].getAttribute("data-stats-url"))];
		if (!stat) {
			continue;
		}
		boxes[i].textContent = "";
		boxes[i].appendChild(
			el(
				"span",
				"",
				stat.count.toLocaleString("ja-JP") + "回ダウンロード",
			),
		);
		var when = formatDateTime(stat.uploaded);
		if (when) {
			boxes[i].appendChild(el("span", "", when + " アップロード"));
		}
	}
}

function loadStats() {
	var repos = [];
	for (var i = 0; i < WORLDS.length; i++) {
		for (var key in WORLDS[i].downloads) {
			var repo = releaseRepo(WORLDS[i].downloads[key].url);
			if (repo && repos.indexOf(repo) === -1) {
				repos.push(repo);
			}
		}
	}
	repos.forEach(function (repo) {
		fetchAssets(repo)
			.then(function (assets) {
				for (var n = 0; n < assets.length; n++) {
					STATS[normalizeUrl(assets[n].url)] = assets[n];
				}
				applyStats();
			})
			.catch(function (error) {
				/* 取得できなくてもページは普通に使える（統計欄が空のままになる） */
				console.warn(error);
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
