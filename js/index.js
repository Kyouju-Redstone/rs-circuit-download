/* ============================================================
   CHANNEL_URL : YouTubeチャンネルのURL。入れると案内の枠に
                 「チャンネルを見る」リンクが出る（不要なら "" のまま）
   ============================================================ */
var CHANNEL_URL = "";

/* ============================================================
   ここを編集して回路を追加します。1つの回路 = 1つのカードです。
   id        : この回路専用リンクの名前。半角の英小文字・数字・ハイフンのみ、回路ごとに別の名前にする
               リンクは  配布ページのURL#id  になる（例: .../#farm）
   downloads : Java版と統合版のうち、あるものだけ書きます
               （片方だけの回路なら、もう片方は消してOK）
     version : 「1.21 以降」のように書く
     youtube : そのエディションの解説動画のID（URLの v= の後ろ11文字）
               空欄なら「動画は準備中」と表示される
   ============================================================ */
var WORLDS = [
	{
		id: "3x3pistondoor",
		title: "3x3 Piston Door",
		description: "size: 5x11x1",
		downloads: {
			java: {
				version: "1.21",
				youtube: "",
				url: "",
			},
			bedrock: {
				version: "1.21",
				youtube: "",
				url: "",
			},
		},
	},
];

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
	row.appendChild(copy);
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
		var link = el("a", "dl " + edition.key);
		link.href = item.url;
		link.setAttribute("download", "");
		var icon = el("span", "ico");
		icon.innerHTML = DOWNLOAD_ICON;
		var text = el("span", "txt");
		text.appendChild(el("b", "", edition.label + "をダウンロード"));
		text.appendChild(el("small", "", item.version + " 対応"));
		link.appendChild(icon);
		link.appendChild(text);
		downloads.appendChild(link);
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
	emptyMessage.hidden = shown > 0;
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

function applyChannel() {
	if (!CHANNEL_URL) {
		return;
	}
	var channel = el("a", "", "チャンネルを見る");
	channel.href = CHANNEL_URL;
	document.getElementById("owner").appendChild(channel);
}

applyChannel();
render();
showTarget();
window.addEventListener("hashchange", showTarget);
