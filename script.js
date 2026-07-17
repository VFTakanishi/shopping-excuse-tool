const APP_VERSION = "2026.07.17-ai-connected-1";
const WORKER_ENDPOINT =
  "https://nameless-forest-d144shopping-excuse-tool-worker.innobd11.workers.dev/";
const WORKER_TIMEOUT_MS = 12000;

const form = document.getElementById("excuse-form");
const itemNameInput = document.getElementById("item-name");
const amountInput = document.getElementById("amount");
const itemError = document.getElementById("item-error");
const amountError = document.getElementById("amount-error");
const generationStatus = document.getElementById("generation-status");
const resultSection = document.getElementById("result-section");
const resultMeta = document.getElementById("result-meta");
const resultText = document.getElementById("result-text");
const regenerateButton = document.getElementById("regenerate-button");
const copyButton = document.getElementById("copy-button");
const copyStatus = document.getElementById("copy-status");
const generationError = document.getElementById("generation-error");
const generationErrorText = document.getElementById("generation-error-text");
const versionText = document.getElementById("app-version-text");

console.info(`Shopping Excuse Tool ${APP_VERSION}`);

if (versionText) {
  versionText.textContent = APP_VERSION;
}

const TEXT = {
  thinking: "\u8a00\u3044\u8a33\u3092\u8003\u3048\u3066\u3044\u307e\u3059\u2026",
  copied: "\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f",
  copyFailed: "\u30b3\u30d4\u30fc\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f",
  itemRequired: "\u5546\u54c1\u540d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  amountRequired: "\u91d1\u984d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  amountInvalid: "\u0031\u5186\u4ee5\u4e0a\u306e\u91d1\u984d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  itemTooGeneric: "\u3082\u3046\u5c11\u3057\u5177\u4f53\u7684\u306a\u5546\u54c1\u540d\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  aiUnavailable:
    "\u3053\u306e\u5546\u54c1\u306b\u5408\u3046\u81ea\u7136\u306a\u8a00\u3044\u8a33\u3092\u307e\u3060\u4f5c\u308c\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u5225\u306e\u8a00\u3044\u65b9\u3067\u8a66\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  workerMissing:
    "AI\u901a\u4fe1\u5148\u304c\u307e\u3060\u8a2d\u5b9a\u3055\u308c\u3066\u3044\u307e\u305b\u3093\u3002",
  workerFailed:
    "\u8a00\u3044\u8a33\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002\u6642\u9593\u3092\u7f6e\u3044\u3066\u3082\u3046\u4e00\u5ea6\u8a66\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  yen: "\u5186"
};

const GENERIC_ONLY_NAMES = new Set([
  "\u3082\u306e",
  "\u30e2\u30ce",
  "\u3084\u3064",
  "\u305d\u308c",
  "\u5546\u54c1",
  "\u54c1\u7269",
  "\u30b5\u30fc\u30d3\u30b9",
  "\u30bb\u30c3\u30c8",
  "\u30d7\u30e9\u30f3"
]);

const SUBTYPE_RULES = [
  { subtype: "gacha", keywords: ["\u30ac\u30c1\u30e3\u30ac\u30c1\u30e3", "\u30ab\u30d7\u30bb\u30eb\u30c8\u30a4", "\u30ac\u30c1\u30e3"] },
  { subtype: "superchat", keywords: ["\u30b9\u30d1\u30c1\u30e3", "\u30b9\u30fc\u30d1\u30fc\u30c1\u30e3\u30c3\u30c8", "super chat", "\u6295\u3052\u92ad", "\u914d\u4fe1\u8005\u652f\u63f4"] },
  { subtype: "sponsor", keywords: ["\u30b9\u30dd\u30f3\u30b5\u30fc\u67a0", "\u5354\u8cdb", "\u30b9\u30dd\u30f3\u30b5\u30fc"] },
  { subtype: "greenCar", keywords: ["\u30b0\u30ea\u30fc\u30f3\u8eca"] },
  { subtype: "vehiclePurchase", keywords: ["\u81ea\u52d5\u8eca", "\u4e2d\u53e4\u8eca", "\u8efd\u81ea\u52d5\u8eca", "\u4e57\u7528\u8eca", "\u8eca\u4e21\u8cfc\u5165", "\u30bb\u30ab\u30f3\u30c9\u30ab\u30fc"] },
  { subtype: "aircon", keywords: ["\u30a8\u30a2\u30b3\u30f3", "\u30af\u30fc\u30e9\u30fc"] },
  { subtype: "seitai", keywords: ["\u6574\u4f53", "\u30de\u30c3\u30b5\u30fc\u30b8"] },
  { subtype: "sneakers", keywords: ["\u30b9\u30cb\u30fc\u30ab\u30fc", "\u9774"] },
  { subtype: "bag", keywords: ["\u30d0\u30c3\u30b0", "\u30ab\u30d0\u30f3", "\u9784", "\u30ea\u30e5\u30c3\u30af", "\u30c8\u30fc\u30c8"] },
  { subtype: "denim", keywords: ["\u30c7\u30cb\u30e0", "\u30b8\u30fc\u30f3\u30ba"] },
  { subtype: "clothes", keywords: ["\u670d", "\u30b7\u30e3\u30c4", "\u30b3\u30fc\u30c8", "\u30b8\u30e3\u30b1\u30c3\u30c8"] },
  { subtype: "seafood", keywords: ["\u6d77\u9bae\u4e3c"] },
  { subtype: "meal", keywords: ["\u713c\u8089", "\u5bff\u53f8", "\u30e9\u30f3\u30c1", "\u30c7\u30a3\u30ca\u30fc", "\u3054\u306f\u3093", "\u98df\u4e8b"] },
  { subtype: "hotel", keywords: ["\u30db\u30c6\u30eb", "\u65c5\u9928", "\u5bbf"] },
  { subtype: "ticket", keywords: ["\u30c1\u30b1\u30c3\u30c8", "\u30e9\u30a4\u30d6"] },
  { subtype: "game", keywords: ["\u30b2\u30fc\u30e0", "\u6f2b\u753b", "\u30d5\u30a3\u30ae\u30e5\u30a2"] },
  { subtype: "device", keywords: ["\u30d1\u30bd\u30b3\u30f3", "\u30b9\u30de\u30db", "\u5de5\u5177", "pc"] },
  { subtype: "beauty", keywords: ["\u7f8e\u5bb9\u6db2", "\u5316\u7ca7\u54c1", "\u30b3\u30b9\u30e1"] },
  { subtype: "living", keywords: ["\u5bb6\u96fb", "\u5bb6\u5177"] }
];

let currentState = null;
let lastExcuse = "";
let copyTimerId = null;

function normalizeText(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function formatYen(amount) {
  return `${new Intl.NumberFormat("ja-JP").format(Math.round(amount))}${TEXT.yen}`;
}

function detectPriceLevel(amount) {
  if (amount <= 2000) return "low";
  if (amount <= 20000) return "normal";
  if (amount <= 100000) return "high";
  return "extreme";
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function unique(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item)) {
      return false;
    }
    seen.add(item);
    return true;
  });
}

function detectSubtype(item) {
  const normalized = normalizeKey(item);
  for (const rule of SUBTYPE_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(normalizeKey(keyword)))) {
      return rule.subtype;
    }
  }
  return "generic";
}

function buildContext(item, amount) {
  return {
    item,
    amount,
    formattedAmount: formatYen(amount),
    per100: formatYen(Math.round(amount / 100)),
    perYear: formatYen(Math.round(amount / 365)),
    subtype: detectSubtype(item)
  };
}

function buildLocalCandidates(context) {
  switch (context.subtype) {
    case "sneakers":
      return [
        `${context.item}に${context.formattedAmount}でも、100回履く前提なら1回あたり${context.per100}です。よく履く一足なら、毎回の満足で十分回収できます。`,
        `${context.formattedAmount}の${context.item}は高く見えても、1年間ちゃんと履くなら1日あたり${context.perYear}です。足元が決まると出かける面倒が減るので、ただの靴代では終わりません。`,
        `${context.item}は出番が多いなら強いです。${context.formattedAmount}でも、毎回これを履けば済む状態になるなら、迷う時間までまとめて買っています。`
      ];
    case "bag":
      return [
        `${context.item}に${context.formattedAmount}でも、毎回これで荷物がまとまるなら高すぎません。使うたびに入れ替える手間が減るので、地味に元を取りやすいです。`,
        `${context.formattedAmount}の${context.item}は強めですが、服に合わせやすくて毎回これで済むなら十分実用です。出番が多いなら、しまいっぱなしの安物よりましです。`,
        `${context.item}は飾りではなく、荷物をちゃんと運ぶための道具です。${context.formattedAmount}で使いやすさと合わせやすさが取れるなら、納得しやすい出費です。`
      ];
    case "greenCar":
      return [
        `${context.item}に${context.formattedAmount}は上乗せ感がありますが、移動で潰れるのを防ぐ出費なら筋は通ります。着いたあとにちゃんと動けるなら、必要な経費です。`,
        `${context.formattedAmount}の${context.item}はぜいたくというより、疲れを買わないためのお金です。移動で消耗しすぎて予定を崩すくらいなら、その前に防いだ方が安いです。`
      ];
    case "seitai":
      return [
        `${context.item}に${context.formattedAmount}は一瞬ためらいますが、体が整って楽になるなら十分回収できます。しんどいまま引っ張るより、先に戻した方が生産性が上がります。`,
        `${context.formattedAmount}の${context.item}は気休めなら高いですが、体の重さが抜けて動きやすくなるなら話は別です。仕事も生活も回しやすくなるので、結果的に得しています。`
      ];
    case "superchat":
      return [
        `${context.item}に${context.formattedAmount}は大きいですが、物を買ったのではなく配信への支援に使ったお金です。応援予算の中で一度にまとめたなら、用途はかなりはっきりしています。`,
        `${context.formattedAmount}の${context.item}は娯楽費としては重めです。ただ、見るだけで終わらせず、配信や活動費に直接寄せた支出だと考えると整理しやすいです。`
      ];
    case "sponsor":
      return [
        `${context.item}に${context.formattedAmount}は軽い額ではありませんが、支援の名目でまとまった金額を出した形です。細かく散らすより予算を切りやすいなら、むしろ管理しやすいです。`,
        `${context.item}は商品代ではなく、活動を支えるための出費です。${context.formattedAmount}を応援予算として最初から切っていたなら、衝動買いとは少し話が違います。`
      ];
    case "vehiclePurchase":
      return [
        `${context.item}に${context.formattedAmount}は安くは見えませんが、車は購入額だけでは決まりません。維持費や修理費を見ても使える状態なら、移動手段を確保する初期費用として筋が通ります。`,
        `${context.formattedAmount}の${context.item}は本体価格だけなら判断できません。ただ、通勤や送迎や荷物運びに使えて、タクシーやレンタカーを減らせるなら十分比較対象になります。`
      ];
    case "aircon":
      return [
        `${context.item}に${context.formattedAmount}は大きいですが、季節になるたび困る物を先に片づけたと思えば自然です。我慢で体調を崩す方が高くつきやすいです。`,
        `${context.formattedAmount}の${context.item}は家電としては普通に重い出費です。ただ、暑さや寒さで眠れない時間が減るなら、生活の土台を買い直したに近いです。`
      ];
    case "gacha":
      return [
        `${context.item}に${context.formattedAmount}なら、物を増やしたというより遊び代です。数千円でその場の面白さと気分転換が買えたなら、そこまで重い話ではありません。`,
        `${context.formattedAmount}の${context.item}は残る物より、その場の楽しさに払ったお金です。映画一本とか軽いレジャーと比べるなら、極端にずれてはいません。`
      ];
    case "seafood":
      return [
        `${context.item}に${context.formattedAmount}は安くないですが、食べたいものを一回でちゃんと満たしたなら十分です。微妙な外食を重ねるより、むしろ出費が増えにくいです。`,
        `${context.formattedAmount}の${context.item}は勢いに見えて、満足を一発で取りにいく出費でもあります。変に妥協して別の店をはしごするより、話が早いです。`
      ];
    case "meal":
      return [
        `${context.item}に${context.formattedAmount}は安くないですが、食事はその場で終わりではありません。ちゃんと満足して余計な買い足しが減るなら、むしろ話が早いです。`,
        `${context.formattedAmount}の${context.item}はぜいたく寄りでも、気分転換と満足を一度で済ませたと思えば整理しやすいです。`
      ];
    case "hotel":
      return [
        `${context.item}に${context.formattedAmount}は高く見えても、寝る場所代だけではありません。移動の疲れを残さず予定をこなせるなら、時間と体力を買った出費です。`,
        `${context.item}は回数で割る物ではなく、その日をちゃんと成立させるための費用です。${context.formattedAmount}で移動計画が無理なく回るなら十分説明できます。`
      ];
    case "clothes":
    case "denim":
      return [
        `${context.item}に${context.formattedAmount}は軽くないですが、ちゃんと着るなら話は変わります。着るたびに迷いが減る服は、思ったより仕事をします。`,
        `${context.formattedAmount}の${context.item}でも、合わせやすくて出番が多いなら十分回収できます。安いのに不満を抱え続けるより、先に片づけた方が早いです。`
      ];
    case "device":
      return [
        `${context.item}に${context.formattedAmount}は大きいですが、使う時間が長い道具は元を取りやすいです。遅さや不便で毎回つまずくなら、先に替えた方が早いです。`,
        `${context.formattedAmount}の${context.item}は高く見えても、作業時間が減るなら理屈が立ちます。毎日触る物ほど、性能差がそのまま効率差になります。`
      ];
    case "beauty":
      return [
        `${context.item}に${context.formattedAmount}は軽くないですが、見た目を整える費用はゼロにはできません。毎朝の迷いが減るなら、思ったより実用です。`,
        `${context.formattedAmount}の${context.item}はぜいたくに見えても、身だしなみを雑にしないための出費です。使うたびに整いやすいなら、十分回収できます。`
      ];
    case "living":
      return [
        `${context.item}に${context.formattedAmount}は大きめでも、家で毎日使う物は元を取りやすいです。ちょっとした不便を毎日受ける方が、あとで効いてきます。`,
        `${context.formattedAmount}の${context.item}は生活費としては重いですが、使うたびに手間が減るなら十分理由になります。`
      ];
    default:
      return [];
  }
}

function buildLocalState(item, amount) {
  const context = buildContext(item, amount);
  return {
    source: "local",
    candidates: unique(shuffle(buildLocalCandidates(context))),
    index: 0,
    meta: ""
  };
}

function fillTemplate(template, item, amount) {
  return template
    .replace(/\{item\}/gu, item)
    .replace(/\{amount\}|\{formattedAmount\}/gu, formatYen(amount));
}

function isSafeAiText(text) {
  if (!text) return false;
  if (text.length < 45 || text.length > 120) return false;
  if (/<|>|https?:\/\/|```|\[|\]|\{item\}.*\{item\}/u.test(text)) return false;
  return true;
}

function buildAiState(item, amount, templates) {
  const candidates = unique(
    templates
      .map((template) => fillTemplate(template, item, amount))
      .map((text) => normalizeText(text))
      .filter(isSafeAiText)
  );

  return {
    source: "ai",
    candidates,
    index: 0,
    meta: ""
  };
}

function hideGenerationError() {
  generationError.classList.add("hidden");
  generationErrorText.textContent = "";
}

function showGenerationError(message) {
  generationError.classList.remove("hidden");
  generationErrorText.textContent = message;
}

function showStatus(message) {
  generationStatus.textContent = message;
  generationStatus.classList.remove("hidden");
}

function hideStatus() {
  generationStatus.textContent = "";
  generationStatus.classList.add("hidden");
}

function validateInputs() {
  const item = normalizeText(itemNameInput.value);
  const amountRaw = normalizeText(amountInput.value);
  const amount = Number(amountRaw);

  itemError.textContent = "";
  amountError.textContent = "";
  hideGenerationError();

  let hasError = false;

  if (!item) {
    itemError.textContent = TEXT.itemRequired;
    hasError = true;
  } else if (GENERIC_ONLY_NAMES.has(item)) {
    itemError.textContent = TEXT.itemTooGeneric;
    hasError = true;
  }

  if (!amountRaw) {
    amountError.textContent = TEXT.amountRequired;
    hasError = true;
  } else if (!Number.isFinite(amount) || amount <= 0) {
    amountError.textContent = TEXT.amountInvalid;
    hasError = true;
  }

  if (hasError) {
    return null;
  }

  return {
    item,
    amount: Math.round(amount),
    subtype: detectSubtype(item),
    priceLevel: detectPriceLevel(Math.round(amount))
  };
}

function showResult(text, meta = "") {
  lastExcuse = text;
  resultText.textContent = text;
  if (meta) {
    resultMeta.textContent = meta;
    resultMeta.classList.remove("hidden");
  } else {
    resultMeta.textContent = "";
    resultMeta.classList.add("hidden");
  }
  resultSection.classList.remove("hidden");
}

function nextExcuse() {
  if (!currentState || currentState.candidates.length === 0) {
    return;
  }
  const text = currentState.candidates[currentState.index];
  currentState.index = (currentState.index + 1) % currentState.candidates.length;
  showResult(text, currentState.meta);
}

async function requestAiExcuses(item, amount, priceLevel) {
  if (!WORKER_ENDPOINT) {
    throw new Error("WORKER_ENDPOINT_MISSING");
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);

  try {
    const response = await fetch(WORKER_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        item,
        amount,
        normalizedItem: normalizeText(item),
        priceLevel
      }),
      signal: controller.signal
    });

    const json = await response.json().catch(() => null);

    if (!response.ok || !json || json.status !== "success") {
      throw new Error(json?.code || `WORKER_${response.status}`);
    }

    if (!Array.isArray(json.templates)) {
      throw new Error("AI_INVALID_RESPONSE");
    }

    return json.templates
      .map((entry) => normalizeText(entry?.template || entry))
      .filter(Boolean);
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function generateAiExcuse(item, amount, priceLevel) {
  const templates = await requestAiExcuses(item, amount, priceLevel);
  const aiState = buildAiState(item, amount, templates);

  if (aiState.candidates.length === 0) {
    throw new Error("AI_EMPTY");
  }

  currentState = aiState;
  nextExcuse();
}

function generateLocalExcuse(item, amount) {
  currentState = buildLocalState(item, amount);
  if (!currentState.candidates.length) {
    showGenerationError(TEXT.aiUnavailable);
    return;
  }
  nextExcuse();
}

async function generateExcuse() {
  const validated = validateInputs();
  if (!validated) {
    return;
  }

  showStatus(TEXT.thinking);

  try {
    if (validated.subtype !== "generic") {
      generateLocalExcuse(validated.item, validated.amount);
      return;
    }

    await generateAiExcuse(validated.item, validated.amount, validated.priceLevel);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "WORKER_ENDPOINT_MISSING") {
      showGenerationError(TEXT.workerMissing);
    } else if (code === "AI_EMPTY" || code === "AI_INVALID_RESPONSE") {
      showGenerationError(TEXT.aiUnavailable);
    } else {
      showGenerationError(TEXT.workerFailed);
    }
  } finally {
    hideStatus();
  }
}

async function copyExcuse() {
  if (!lastExcuse) {
    return;
  }
  try {
    await navigator.clipboard.writeText(lastExcuse);
    copyStatus.textContent = TEXT.copied;
    window.clearTimeout(copyTimerId);
    copyTimerId = window.setTimeout(() => {
      copyStatus.textContent = "";
    }, 1600);
  } catch {
    copyStatus.textContent = TEXT.copyFailed;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateExcuse();
});

regenerateButton.addEventListener("click", () => {
  if (!currentState) {
    generateExcuse();
    return;
  }
  nextExcuse();
});

copyButton.addEventListener("click", () => {
  copyExcuse();
});

itemNameInput.addEventListener("input", () => {
  itemError.textContent = "";
  hideGenerationError();
});

amountInput.addEventListener("input", () => {
  amountError.textContent = "";
  hideGenerationError();
});
