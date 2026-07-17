const APP_VERSION = "2026.07.17-ai-complete-1";
const WORKER_BASE_URL =
  "https://nameless-forest-d144shopping-excuse-tool-worker.innobd11.workers.dev";
const WORKER_GENERATE_URL = `${WORKER_BASE_URL}/generate`;
const WORKER_HEALTH_URL = `${WORKER_BASE_URL}/health`;
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
  thinking: "言い訳を考えています…",
  copied: "コピーしました",
  copyFailed: "コピーできませんでした",
  itemRequired: "商品名を入力してください。",
  amountRequired: "金額を入力してください。",
  amountInvalid: "1円以上の金額を入力してください。",
  itemTooGeneric: "もう少し具体的な商品名にしてください。",
  aiUnavailable:
    "未登録の商品ですが、今はAIで自然な言い訳を作れませんでした。時間を置いて再度お試しください。",
  workerMissing: "AI接続先の設定が見つかりません。",
  workerFailed:
    "言い訳の生成に失敗しました。通信状態を確認して再度お試しください。",
  yen: "円"
};

const GENERIC_ONLY_NAMES = new Set([
  "もの",
  "モノ",
  "やつ",
  "それ",
  "商品",
  "品物",
  "サービス",
  "セット",
  "プラン"
]);

const SUBTYPE_RULES = [
  {
    subtype: "aircon",
    exact: ["エアコン", "ルームエアコン"],
    patterns: [/^エアコン(?:\s|$)/u, /^ルームエアコン/u],
    excludes: ["クーラーボックス", "cpuクーラー"]
  },
  {
    subtype: "laptop",
    exact: ["macbook", "macbook air", "macbook pro"],
    patterns: [/^macbook/u, /ノートpc/u, /ノートパソコン/u, /ラップトップ/u],
    excludes: []
  },
  {
    subtype: "pc",
    exact: ["パソコン", "pc", "デスクトップpc", "デスクトップパソコン"],
    patterns: [/(^|[^a-z])pc([^a-z]|$)/iu, /パソコン/u, /ゲーミングpc/u],
    excludes: []
  },
  {
    subtype: "smartphone",
    exact: ["スマホ", "iphone", "android"],
    patterns: [/スマホ/u, /iphone/u, /android/u],
    excludes: ["スマホケース", "スマホ修理", "スマホゲーム課金"]
  },
  {
    subtype: "smartphoneCase",
    exact: ["スマホケース", "iphoneケース"],
    patterns: [/スマホケース/u, /iphoneケース/u],
    excludes: []
  },
  {
    subtype: "smartphoneRepair",
    exact: ["スマホ修理", "iphone修理"],
    patterns: [/スマホ修理/u, /iphone修理/u],
    excludes: []
  },
  {
    subtype: "mobileGameCharge",
    exact: ["スマホゲーム課金", "ゲーム課金"],
    patterns: [/スマホゲーム課金/u, /ゲーム課金/u],
    excludes: []
  },
  {
    subtype: "sneakers",
    exact: ["スニーカー"],
    patterns: [/スニーカー/u],
    excludes: []
  },
  {
    subtype: "bag",
    exact: ["バッグ", "カバン", "鞄", "リュック", "トート"],
    patterns: [/バッグ/u, /カバン/u, /鞄/u, /リュック/u, /トート/u],
    excludes: []
  },
  {
    subtype: "seitai",
    exact: ["整体", "マッサージ"],
    patterns: [/整体/u, /マッサージ/u],
    excludes: []
  },
  {
    subtype: "greenCar",
    exact: ["グリーン車"],
    patterns: [/グリーン車/u],
    excludes: []
  },
  {
    subtype: "seafoodBowl",
    exact: ["海鮮丼"],
    patterns: [/海鮮丼/u],
    excludes: []
  },
  {
    subtype: "superchat",
    exact: ["スパチャ", "スーパーチャット", "投げ銭"],
    patterns: [/スパチャ/u, /スーパーチャット/u, /投げ銭/u, /配信者支援/u],
    excludes: []
  },
  {
    subtype: "sponsor",
    exact: ["スポンサー枠"],
    patterns: [/スポンサー枠/u, /協賛/u],
    excludes: []
  },
  {
    subtype: "carPurchase",
    exact: ["自動車", "中古車", "軽自動車", "乗用車", "車両購入"],
    patterns: [/中古車/u, /軽自動車/u, /乗用車/u, /車両購入/u, /^自動車$/u],
    excludes: ["自動車税", "自動車保険", "自動車部品"]
  },
  {
    subtype: "chair",
    exact: ["椅子", "チェア"],
    patterns: [/椅子/u, /チェア/u],
    excludes: []
  },
  {
    subtype: "earphone",
    exact: ["イヤホン", "ワイヤレスイヤホン", "airpods"],
    patterns: [/イヤホン/u, /airpods/u],
    excludes: []
  },
  {
    subtype: "pen",
    exact: ["ボールペン", "ペン"],
    patterns: [/ボールペン/u, /ペン/u],
    excludes: ["ペンケース"]
  },
  {
    subtype: "gacha",
    exact: ["ガチャガチャ", "ガチャ", "カプセルトイ"],
    patterns: [/ガチャガチャ/u, /カプセルトイ/u, /^ガチャ$/u],
    excludes: []
  }
];

let currentState = null;
let lastExcuse = "";
let copyTimerId = null;
let isGenerating = false;

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim();
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
    if (!item || seen.has(item)) return false;
    seen.add(item);
    return true;
  });
}

function matchesRule(normalizedItem, rule) {
  const hasExclude = (rule.excludes || []).some((term) =>
    normalizedItem.includes(normalizeKey(term))
  );
  if (hasExclude) {
    return false;
  }

  const exactMatch = (rule.exact || []).some(
    (term) => normalizedItem === normalizeKey(term)
  );
  if (exactMatch) {
    return true;
  }

  return (rule.patterns || []).some((pattern) => pattern.test(normalizedItem));
}

function detectSubtype(item) {
  const normalizedItem = normalizeKey(item);
  for (const rule of SUBTYPE_RULES) {
    if (matchesRule(normalizedItem, rule)) {
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
        `${context.item}は出番が多いなら強いです。毎回これを履けば済む状態になるなら、迷う時間までまとめて買ったと考えられます。`
      ];
    case "bag":
      return [
        `${context.item}に${context.formattedAmount}でも、毎回これで荷物がまとまるなら高すぎません。入れ替える手間が減るので、地味に元を取りやすいです。`,
        `${context.formattedAmount}の${context.item}は強めですが、服に合わせやすくて毎回これで済むなら十分実用です。`,
        `${context.item}は飾りではなく道具です。使いやすさと合わせやすさが揃うなら、納得しやすい出費です。`
      ];
    case "seitai":
      return [
        `${context.item}に${context.formattedAmount}は一瞬ためらいますが、体が整って楽になるなら十分回収できます。しんどいまま引っ張るより先に戻した方が早いです。`,
        `${context.formattedAmount}の${context.item}は気休めなら高いですが、動きやすくなるなら話は別です。仕事も生活も回しやすくなるので結果的に得しています。`
      ];
    case "greenCar":
      return [
        `${context.item}に${context.formattedAmount}は上乗せ感がありますが、移動で潰れるのを防ぐ出費なら筋は通ります。着いたあとにちゃんと動けるなら必要経費です。`,
        `${context.formattedAmount}の${context.item}はぜいたくというより、疲れを買わないためのお金です。移動で予定を崩すくらいなら先に防いだ方が安いです。`
      ];
    case "seafoodBowl":
      return [
        `${context.item}に${context.formattedAmount}は安くないですが、食べたいものを一回でちゃんと満たしたなら十分です。微妙な外食を重ねるより出費が増えにくいです。`,
        `${context.formattedAmount}の${context.item}は勢いに見えて、満足を一発で取りにいく出費でもあります。変に妥協して別の店をはしごするより話が早いです。`
      ];
    case "superchat":
      return [
        `${context.item}に${context.formattedAmount}は大きいですが、物を買ったのではなく配信への支援に使ったお金です。応援予算の中でまとめたなら用途はかなり明確です。`,
        `${context.formattedAmount}の${context.item}は娯楽費としては重めです。ただ、配信や活動費に直接寄せた支出だと考えると整理しやすいです。`
      ];
    case "sponsor":
      return [
        `${context.item}に${context.formattedAmount}は軽い額ではありませんが、支援の名目でまとまった金額を出した形です。細かく散らすより予算を切りやすいなら管理しやすいです。`,
        `${context.item}は商品代ではなく活動を支えるための出費です。最初から応援予算として切っていたなら衝動買いとは少し違います。`
      ];
    case "carPurchase":
      return [
        `${context.item}に${context.formattedAmount}は安くは見えませんが、車は購入額だけでは決まりません。維持費や修理費を見ても使える状態なら、移動手段を確保する初期費用として筋が通ります。`,
        `${context.formattedAmount}の${context.item}は本体価格だけでは判断できません。ただ、通勤や送迎や荷物運びに使えて、タクシーやレンタカーを減らせるなら比較対象になります。`
      ];
    case "aircon":
      return [
        `${context.item}に${context.formattedAmount}は大きいですが、季節になるたび困る物を先に片づけたと思えば自然です。我慢で体調を崩す方が高くつきやすいです。`,
        `${context.formattedAmount}の${context.item}は家電としては重い出費ですが、眠れない時間が減るなら生活の土台を買い直したのに近いです。`
      ];
    case "laptop":
      return [
        `${context.item}に${context.formattedAmount}は大きいですが、画面とキーボードとトラックパッドを毎日触るなら作業の詰まりを減らす投資です。`,
        `${context.formattedAmount}の${context.item}は高く見えても、起動の遅さや熱や不安定さで毎回止まるよりは話が早いです。`
      ];
    case "pc":
      return [
        `${context.item}に${context.formattedAmount}は大きいですが、使う時間が長い道具は元を取りやすいです。毎回の待ち時間が減るなら十分説明できます。`,
        `${context.formattedAmount}の${context.item}は高く見えても、作業時間が減るなら理屈は立ちます。毎日触る物ほど差が効きます。`
      ];
    case "smartphone":
      return [
        `${context.item}に${context.formattedAmount}は強めですが、毎日使う時間が長い物なので不便の解消がそのまま回収につながります。`,
        `${context.formattedAmount}の${context.item}は高く見えても、電池や動作のストレスが減るなら生活全体の詰まりを減らす出費です。`
      ];
    case "smartphoneCase":
      return [
        `${context.item}に${context.formattedAmount}なら、落とした一回で本体修理に行くよりずっと安いです。保険料に近い出費だと考える方が自然です。`,
        `${context.formattedAmount}の${context.item}は小さい買い物ですが、本体を雑に扱わずに済むなら十分役目を果たしています。`
      ];
    case "smartphoneRepair":
      return [
        `${context.item}に${context.formattedAmount}は痛いですが、使える本体を延命できるなら買い替えより話が早いです。`,
        `${context.formattedAmount}の${context.item}は出費としては重くても、今の端末をそのまま使い続けられるなら十分理由になります。`
      ];
    case "mobileGameCharge":
      return [
        `${context.item}に${context.formattedAmount}は実用品ではありませんが、最初から遊びの予算として切っているなら筋は通ります。`,
        `${context.formattedAmount}の${context.item}は軽い額ではないですが、その期間ちゃんと遊ぶ目的があるなら散発的に崩すよりは管理しやすいです。`
      ];
    case "chair":
      return [
        `${context.item}に${context.formattedAmount}は大きく見えても、毎日座る物なら体への負担を減らす効果がそのまま回収につながります。`,
        `${context.formattedAmount}の${context.item}は生活用品としては重めですが、長時間の姿勢が少しでも楽になるなら削る所ではありません。`
      ];
    case "earphone":
      return [
        `${context.item}に${context.formattedAmount}でも、毎日使うなら十分回収しやすいです。接続や音切れの小さなストレスが消えるだけでも価値があります。`,
        `${context.formattedAmount}の${context.item}は高く見えても、通勤や作業時間の快適さを毎回買い直さずに済むなら筋は通ります。`
      ];
    case "pen":
      return [
        `${context.item}に${context.formattedAmount}なら、毎日手に取る道具としてはそこまで大げさではありません。書くたびに小さな不満が減るなら十分です。`,
        `${context.formattedAmount}の${context.item}は小さい出費でも、使う頻度が高い道具ほど地味に満足が積み上がります。`
      ];
    case "gacha":
      return [
        `${context.item}に${context.formattedAmount}なら、物を増やしたというより遊び代です。数百円や数千円でその場の面白さを買えたなら役目は果たしています。`,
        `${context.formattedAmount}の${context.item}は残る物より、その場の楽しさに払ったお金です。軽いレジャーと比べるなら極端にずれてはいません。`
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
    .replace(/\{amount\}/gu, formatYen(amount));
}

function isSafeAiText(text) {
  if (!text) return false;
  if (text.length < 45 || text.length > 120) return false;
  if (/<|>|https?:\/\/|```|\[[^\]]*\]/u.test(text)) return false;
  return true;
}

function buildAiState(item, amount, templates, source) {
  return {
    source,
    candidates: unique(
      templates
        .map((template) => normalizeText(fillTemplate(template, item, amount)))
        .filter(isSafeAiText)
    ),
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

function resetResultState() {
  currentState = null;
  lastExcuse = "";
  resultText.textContent = "";
  resultMeta.textContent = "";
  resultMeta.classList.add("hidden");
  resultSection.classList.add("hidden");
  copyStatus.textContent = "";
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

  if (hasError) return null;

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
  if (!currentState || currentState.candidates.length === 0) return;
  const text = currentState.candidates[currentState.index];
  currentState.index = (currentState.index + 1) % currentState.candidates.length;
  showResult(text, currentState.meta);
}

async function requestAiExcuses(item, amount) {
  const controller = new AbortController();
  const timerId = window.setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);

  try {
    const response = await fetch(WORKER_GENERATE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ item, amount }),
      signal: controller.signal
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload) {
      throw new Error(payload?.code || `HTTP_${response.status}`);
    }
    if (payload.status !== "success" || !Array.isArray(payload.templates)) {
      throw new Error("AI_INVALID_RESPONSE");
    }

    return payload;
  } finally {
    window.clearTimeout(timerId);
  }
}

function mapWorkerError(code) {
  switch (code) {
    case "AI_KEY_MISSING":
      return "AI接続設定が不足しています。";
    case "MODEL_NOT_FOUND":
      return "AIモデルの設定に問題があります。";
    case "AI_RATE_LIMITED":
      return "AI側の利用上限に達しました。しばらく待って再度お試しください。";
    case "AI_TIMEOUT":
      return "AIからの応答が間に合いませんでした。再度お試しください。";
    case "ORIGIN_NOT_ALLOWED":
      return "このページからはAI接続を利用できません。公開ページからお試しください。";
    case "CACHE_NOT_CONFIGURED":
      return "AIキャッシュ設定が不足しています。";
    case "AI_INVALID_RESPONSE":
      return TEXT.aiUnavailable;
    default:
      return TEXT.workerFailed;
  }
}

async function generateLocalExcuse(validated) {
  currentState = buildLocalState(validated.item, validated.amount);
  nextExcuse();
}

async function generateAiExcuse(validated) {
  const payload = await requestAiExcuses(validated.item, validated.amount);
  currentState = buildAiState(
    validated.item,
    validated.amount,
    payload.templates,
    payload.source || "ai"
  );
  if (currentState.candidates.length === 0) {
    throw new Error("AI_INVALID_RESPONSE");
  }
  nextExcuse();
}

async function generateExcuse() {
  if (isGenerating) return;

  const validated = validateInputs();
  if (!validated) return;

  isGenerating = true;
  resetResultState();
  showStatus(TEXT.thinking);

  try {
    if (validated.subtype !== "generic") {
      await generateLocalExcuse(validated);
      return;
    }

    await generateAiExcuse(validated);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "WORKER_ENDPOINT_MISSING") {
      showGenerationError(TEXT.workerMissing);
    } else {
      showGenerationError(mapWorkerError(code));
    }
  } finally {
    isGenerating = false;
    hideStatus();
  }
}

async function copyExcuse() {
  if (!lastExcuse) return;
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
