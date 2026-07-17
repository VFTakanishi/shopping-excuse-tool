const APP_VERSION = "2026.07.17-human-logic-2";

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

let currentState = null;
let lastExcuse = "";
let copyTimerId = null;

const TEXT = {
  thinking: "\u8a00\u3044\u8a33\u3092\u8003\u3048\u3066\u3044\u307e\u3059\u2026",
  copied: "\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f",
  copyFailed: "\u30b3\u30d4\u30fc\u3067\u304d\u307e\u305b\u3093\u3067\u3057\u305f",
  itemRequired: "\u5546\u54c1\u540d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  amountRequired: "\u91d1\u984d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  amountInvalid: "\u0031\u5186\u4ee5\u4e0a\u306e\u91d1\u984d\u3092\u5165\u529b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  itemTooGeneric: "\u3082\u3046\u5c11\u3057\u5177\u4f53\u7684\u306a\u5546\u54c1\u540d\u306b\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
  generationFailed:
    "\u4eca\u56de\u306f\u3046\u307e\u304f\u8a00\u3044\u8a33\u3092\u7d44\u307f\u7acb\u3066\u3089\u308c\u307e\u305b\u3093\u3067\u3057\u305f\u3002\u5225\u306e\u8a00\u3044\u65b9\u3067\u5546\u54c1\u540d\u3092\u5165\u308c\u3066\u307f\u3066\u304f\u3060\u3055\u3044\u3002",
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

const RULES = [
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

function normalizeText(value) {
  return String(value || "").normalize("NFKC").replace(/\s+/gu, " ").trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function formatYen(amount) {
  return `${new Intl.NumberFormat("ja-JP").format(Math.round(amount))}${TEXT.yen}`;
}

function shuffle(array) {
  const copy = [...array];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function pickUnique(items) {
  const seen = new Set();
  return shuffle(items).filter((item) => {
    if (!item || seen.has(item)) {
      return false;
    }
    seen.add(item);
    return true;
  });
}

function detectSubtype(item) {
  const normalized = normalizeKey(item);
  for (const rule of RULES) {
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

function linesFor(context) {
  switch (context.subtype) {
    case "sneakers":
      return [
        `${context.item}\u306b${context.formattedAmount}\u3067\u3082\u3001100\u56de\u5c65\u304f\u524d\u63d0\u306a\u30891\u56de\u3042\u305f\u308a${context.per100}\u3067\u3059\u3002\u3088\u304f\u5c65\u304f\u4e00\u8db3\u306a\u3089\u3001\u6bce\u56de\u306e\u6e80\u8db3\u3067\u5341\u5206\u56de\u53ce\u3067\u304d\u307e\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u9ad8\u304f\u898b\u3048\u3066\u3082\u30011\u5e74\u9593\u3061\u3083\u3093\u3068\u5c65\u304f\u306a\u30891\u65e5\u3042\u305f\u308a${context.perYear}\u3067\u3059\u3002\u8db3\u5143\u304c\u6c7a\u307e\u308b\u3068\u51fa\u304b\u3051\u308b\u9762\u5012\u304c\u6e1b\u308b\u306e\u3067\u3001\u305f\u3060\u306e\u9774\u4ee3\u3067\u306f\u7d42\u308f\u308a\u307e\u305b\u3093\u3002`,
        `${context.item}\u306f\u51fa\u756a\u304c\u591a\u3044\u306a\u3089\u5f37\u3044\u3067\u3059\u3002${context.formattedAmount}\u3067\u3082\u3001\u6bce\u56de\u3053\u308c\u3092\u5c65\u3051\u3070\u6e08\u3080\u72b6\u614b\u306b\u306a\u308b\u306a\u3089\u3001\u8ff7\u3046\u6642\u9593\u307e\u3067\u307e\u3068\u3081\u3066\u8cb7\u3063\u3066\u3044\u307e\u3059\u3002`
      ];
    case "bag":
      return [
        `${context.item}\u306b${context.formattedAmount}\u3067\u3082\u3001\u6bce\u56de\u3053\u308c\u3067\u8377\u7269\u304c\u307e\u3068\u307e\u308b\u306a\u3089\u9ad8\u3059\u304e\u307e\u305b\u3093\u3002\u4f7f\u3046\u305f\u3073\u306b\u5165\u308c\u66ff\u3048\u308b\u624b\u9593\u304c\u6e1b\u308b\u306e\u3067\u3001\u5730\u5473\u306b\u5143\u3092\u53d6\u308a\u3084\u3059\u3044\u3067\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u5f37\u3081\u3067\u3059\u304c\u3001\u670d\u306b\u5408\u308f\u305b\u3084\u3059\u304f\u3066\u6bce\u56de\u3053\u308c\u3067\u6e08\u3080\u306a\u3089\u5341\u5206\u5b9f\u7528\u3067\u3059\u3002\u51fa\u756a\u304c\u591a\u3044\u306a\u3089\u3001\u3057\u307e\u3044\u3063\u3071\u306a\u3057\u306e\u5b89\u7269\u3088\u308a\u307e\u3057\u3067\u3059\u3002`,
        `${context.item}\u306f\u98fe\u308a\u3067\u306f\u306a\u304f\u3001\u8377\u7269\u3092\u3061\u3083\u3093\u3068\u904b\u3076\u305f\u3081\u306e\u9053\u5177\u3067\u3059\u3002${context.formattedAmount}\u3067\u4f7f\u3044\u3084\u3059\u3055\u3068\u5408\u308f\u305b\u3084\u3059\u3055\u304c\u53d6\u308c\u308b\u306a\u3089\u3001\u7d0d\u5f97\u3057\u3084\u3059\u3044\u51fa\u8cbb\u3067\u3059\u3002`
      ];
    case "greenCar":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u4e0a\u4e57\u305b\u611f\u304c\u3042\u308a\u307e\u3059\u304c\u3001\u79fb\u52d5\u3067\u6f70\u308c\u308b\u306e\u3092\u9632\u3050\u51fa\u8cbb\u306a\u3089\u7b4b\u306f\u901a\u308a\u307e\u3059\u3002\u7740\u3044\u305f\u3042\u3068\u306b\u3061\u3083\u3093\u3068\u52d5\u3051\u308b\u306a\u3089\u3001\u5fc5\u8981\u306a\u7d4c\u8cbb\u3067\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u305c\u3044\u305f\u304f\u3068\u3044\u3046\u3088\u308a\u3001\u75b2\u308c\u3092\u8cb7\u308f\u306a\u3044\u305f\u3081\u306e\u304a\u91d1\u3067\u3059\u3002\u79fb\u52d5\u3067\u6d88\u8017\u3057\u3059\u304e\u3066\u4e88\u5b9a\u3092\u5d29\u3059\u304f\u3089\u3044\u306a\u3089\u3001\u305d\u306e\u524d\u306b\u9632\u3044\u3060\u65b9\u304c\u5b89\u3044\u3067\u3059\u3002`
      ];
    case "seitai":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u4e00\u77ac\u305f\u3081\u3089\u3044\u307e\u3059\u304c\u3001\u4f53\u304c\u6574\u3063\u3066\u697d\u306b\u306a\u308b\u306a\u3089\u5341\u5206\u56de\u53ce\u3067\u304d\u307e\u3059\u3002\u3057\u3093\u3069\u3044\u307e\u307e\u5f15\u3063\u5f35\u308b\u3088\u308a\u3001\u5148\u306b\u623b\u3057\u305f\u65b9\u304c\u751f\u7523\u6027\u304c\u4e0a\u304c\u308a\u307e\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u6c17\u4f11\u3081\u306a\u3089\u9ad8\u3044\u3067\u3059\u304c\u3001\u4f53\u306e\u91cd\u3055\u304c\u629c\u3051\u3066\u52d5\u304d\u3084\u3059\u304f\u306a\u308b\u306a\u3089\u8a71\u306f\u5225\u3067\u3059\u3002\u4ed5\u4e8b\u3082\u751f\u6d3b\u3082\u56de\u3057\u3084\u3059\u304f\u306a\u308b\u306e\u3067\u3001\u7d50\u679c\u7684\u306b\u5f97\u3057\u3066\u3044\u307e\u3059\u3002`
      ];
    case "superchat":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u5927\u304d\u3044\u3067\u3059\u304c\u3001\u7269\u3092\u8cb7\u3063\u305f\u306e\u3067\u306f\u306a\u304f\u914d\u4fe1\u3078\u306e\u652f\u63f4\u306b\u4f7f\u3063\u305f\u304a\u91d1\u3067\u3059\u3002\u5fdc\u63f4\u4e88\u7b97\u306e\u4e2d\u3067\u4e00\u5ea6\u306b\u307e\u3068\u3081\u305f\u306a\u3089\u3001\u7528\u9014\u306f\u304b\u306a\u308a\u306f\u3063\u304d\u308a\u3057\u3066\u3044\u307e\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u5a2f\u697d\u8cbb\u3068\u3057\u3066\u306f\u91cd\u3081\u3067\u3059\u3002\u305f\u3060\u3001\u898b\u308b\u3060\u3051\u3067\u7d42\u308f\u3089\u305b\u305a\u3001\u914d\u4fe1\u3084\u6d3b\u52d5\u8cbb\u306b\u76f4\u63a5\u5bc4\u305b\u305f\u652f\u51fa\u3060\u3068\u8003\u3048\u308b\u3068\u6574\u7406\u3057\u3084\u3059\u3044\u3067\u3059\u3002`
      ];
    case "sponsor":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u8efd\u3044\u984d\u3067\u306f\u306a\u3044\u3067\u3059\u304c\u3001\u652f\u63f4\u306e\u540d\u76ee\u3067\u307e\u3068\u307e\u3063\u305f\u91d1\u984d\u3092\u51fa\u3057\u305f\u5f62\u3067\u3059\u3002\u7d30\u304b\u304f\u6563\u3089\u3059\u3088\u308a\u4e88\u7b97\u3092\u5207\u308a\u3084\u3059\u3044\u306a\u3089\u3001\u3080\u3057\u308d\u7ba1\u7406\u3057\u3084\u3059\u3044\u3067\u3059\u3002`,
        `${context.item}\u306f\u5546\u54c1\u4ee3\u3067\u306f\u306a\u304f\u3001\u6d3b\u52d5\u3092\u652f\u3048\u308b\u305f\u3081\u306e\u51fa\u8cbb\u3067\u3059\u3002${context.formattedAmount}\u3092\u5fdc\u63f4\u4e88\u7b97\u3068\u3057\u3066\u6700\u521d\u304b\u3089\u5207\u3063\u3066\u3044\u305f\u306a\u3089\u3001\u885d\u52d5\u8cb7\u3044\u3068\u306f\u5c11\u3057\u8a71\u304c\u9055\u3044\u307e\u3059\u3002`
      ];
    case "vehiclePurchase":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u5b89\u304f\u306f\u898b\u3048\u307e\u305b\u3093\u304c\u3001\u8eca\u306f\u8cfc\u5165\u984d\u3060\u3051\u3067\u306f\u6c7a\u307e\u308a\u307e\u305b\u3093\u3002\u7dad\u6301\u8cbb\u3084\u4fee\u7406\u8cbb\u3092\u898b\u3066\u3082\u4f7f\u3048\u308b\u72b6\u614b\u306a\u3089\u3001\u79fb\u52d5\u624b\u6bb5\u3092\u78ba\u4fdd\u3059\u308b\u521d\u671f\u8cbb\u7528\u3068\u3057\u3066\u7b4b\u304c\u901a\u308a\u307e\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u672c\u4f53\u4fa1\u683c\u3060\u3051\u306a\u3089\u5224\u65ad\u3067\u304d\u307e\u305b\u3093\u3002\u305f\u3060\u3001\u901a\u52e4\u3084\u9001\u8fce\u3084\u8377\u7269\u904b\u3073\u306b\u4f7f\u3048\u3066\u3001\u30bf\u30af\u30b7\u30fc\u3084\u30ec\u30f3\u30bf\u30ab\u30fc\u3092\u6e1b\u3089\u305b\u308b\u306a\u3089\u5341\u5206\u6bd4\u8f03\u5bfe\u8c61\u306b\u306a\u308a\u307e\u3059\u3002`
      ];
    case "aircon":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u5927\u304d\u3044\u3067\u3059\u304c\u3001\u5b63\u7bc0\u306b\u306a\u308b\u305f\u3073\u56f0\u308b\u7269\u3092\u5148\u306b\u7247\u3065\u3051\u305f\u3068\u601d\u3048\u3070\u81ea\u7136\u3067\u3059\u3002\u6211\u6162\u3067\u4f53\u8abf\u3092\u5d29\u3059\u65b9\u304c\u9ad8\u304f\u3064\u304d\u3084\u3059\u3044\u3067\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u5bb6\u96fb\u3068\u3057\u3066\u306f\u666e\u901a\u306b\u91cd\u3044\u51fa\u8cbb\u3067\u3059\u3002\u305f\u3060\u3001\u6691\u3055\u3084\u5bd2\u3055\u3067\u7720\u308c\u306a\u3044\u6642\u9593\u304c\u6e1b\u308b\u306a\u3089\u3001\u751f\u6d3b\u306e\u571f\u53f0\u3092\u8cb7\u3044\u76f4\u3057\u305f\u306b\u8fd1\u3044\u3067\u3059\u3002`
      ];
    case "gacha":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306a\u3089\u3001\u7269\u3092\u5897\u3084\u3057\u305f\u3068\u3044\u3046\u3088\u308a\u904a\u3073\u4ee3\u3067\u3059\u3002\u6570\u5343\u5186\u3067\u305d\u306e\u5834\u306e\u9762\u767d\u3055\u3068\u6c17\u5206\u8ee2\u63db\u304c\u8cb7\u3048\u305f\u306a\u3089\u3001\u305d\u3053\u307e\u3067\u91cd\u3044\u8a71\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u6b8b\u308b\u7269\u3088\u308a\u3001\u305d\u306e\u5834\u306e\u697d\u3057\u3055\u306b\u6255\u3063\u305f\u304a\u91d1\u3067\u3059\u3002\u6620\u753b\u4e00\u672c\u3068\u304b\u8efd\u3044\u30ec\u30b8\u30e3\u30fc\u3068\u6bd4\u3079\u308b\u306a\u3089\u3001\u6975\u7aef\u306b\u305a\u308c\u3066\u306f\u3044\u307e\u305b\u3093\u3002`
      ];
    case "seafood":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u5b89\u304f\u306a\u3044\u3067\u3059\u304c\u3001\u98df\u3079\u305f\u3044\u3082\u306e\u3092\u4e00\u56de\u3067\u3061\u3083\u3093\u3068\u6e80\u305f\u3057\u305f\u306a\u3089\u5341\u5206\u3067\u3059\u3002\u5fae\u5999\u306a\u5916\u98df\u3092\u91cd\u306d\u308b\u3088\u308a\u3001\u3080\u3057\u308d\u51fa\u8cbb\u304c\u5897\u3048\u306b\u304f\u3044\u3067\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u52e2\u3044\u306b\u898b\u3048\u3066\u3001\u6e80\u8db3\u3092\u4e00\u767a\u3067\u53d6\u308a\u306b\u3044\u304f\u51fa\u8cbb\u3067\u3082\u3042\u308a\u307e\u3059\u3002\u5909\u306b\u59a5\u5354\u3057\u3066\u5225\u306e\u5e97\u3092\u306f\u3057\u3054\u3059\u308b\u3088\u308a\u3001\u8a71\u304c\u65e9\u3044\u3067\u3059\u3002`
      ];
    case "meal":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u5b89\u304f\u306a\u3044\u3067\u3059\u304c\u3001\u98df\u4e8b\u306f\u305d\u306e\u5834\u3067\u7d42\u308f\u308a\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u3061\u3083\u3093\u3068\u6e80\u8db3\u3057\u3066\u4f59\u8a08\u306a\u8cb7\u3044\u8db3\u3057\u304c\u6e1b\u308b\u306a\u3089\u3001\u3080\u3057\u308d\u8a71\u304c\u65e9\u3044\u3067\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u305c\u3044\u305f\u304f\u5bc4\u308a\u3067\u3082\u3001\u6c17\u5206\u8ee2\u63db\u3068\u6e80\u8db3\u3092\u4e00\u5ea6\u3067\u6e08\u307e\u305b\u305f\u3068\u601d\u3048\u3070\u6574\u7406\u3057\u3084\u3059\u3044\u3067\u3059\u3002`
      ];
    case "hotel":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u9ad8\u304f\u898b\u3048\u3066\u3082\u3001\u5bdd\u308b\u5834\u6240\u4ee3\u3060\u3051\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u79fb\u52d5\u306e\u75b2\u308c\u3092\u6b8b\u3055\u305a\u4e88\u5b9a\u3092\u3053\u306a\u305b\u308b\u306a\u3089\u3001\u6642\u9593\u3068\u4f53\u529b\u3092\u8cb7\u3063\u305f\u51fa\u8cbb\u3067\u3059\u3002`,
        `${context.item}\u306f\u56de\u6570\u3067\u5272\u308b\u7269\u3067\u306f\u306a\u304f\u3001\u305d\u306e\u65e5\u3092\u3061\u3083\u3093\u3068\u6210\u7acb\u3055\u305b\u308b\u305f\u3081\u306e\u8cbb\u7528\u3067\u3059\u3002${context.formattedAmount}\u3067\u79fb\u52d5\u8a08\u753b\u304c\u7121\u7406\u306a\u304f\u56de\u308b\u306a\u3089\u5341\u5206\u8aac\u660e\u3067\u304d\u307e\u3059\u3002`
      ];
    case "clothes":
    case "denim":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u8efd\u304f\u306a\u3044\u3067\u3059\u304c\u3001\u3061\u3083\u3093\u3068\u7740\u308b\u306a\u3089\u8a71\u306f\u5909\u308f\u308a\u307e\u3059\u3002\u7740\u308b\u305f\u3073\u306b\u8ff7\u3044\u304c\u6e1b\u308b\u670d\u306f\u3001\u601d\u3063\u305f\u3088\u308a\u4ed5\u4e8b\u3092\u3057\u307e\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u3067\u3082\u3001\u5408\u308f\u305b\u3084\u3059\u304f\u3066\u51fa\u756a\u304c\u591a\u3044\u306a\u3089\u5341\u5206\u56de\u53ce\u3067\u304d\u307e\u3059\u3002\u5b89\u3044\u306e\u306b\u4e0d\u6e80\u3092\u62b1\u3048\u7d9a\u3051\u308b\u3088\u308a\u3001\u5148\u306b\u7247\u3065\u3051\u305f\u65b9\u304c\u65e9\u3044\u3067\u3059\u3002`
      ];
    case "device":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u5927\u304d\u3044\u3067\u3059\u304c\u3001\u4f7f\u3046\u6642\u9593\u304c\u9577\u3044\u9053\u5177\u306f\u5143\u3092\u53d6\u308a\u3084\u3059\u3044\u3067\u3059\u3002\u9045\u3055\u3084\u4e0d\u4fbf\u3067\u6bce\u56de\u3064\u307e\u305a\u304f\u306a\u3089\u3001\u5148\u306b\u66ff\u3048\u305f\u65b9\u304c\u65e9\u3044\u3067\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u9ad8\u304f\u898b\u3048\u3066\u3082\u3001\u4f5c\u696d\u6642\u9593\u304c\u6e1b\u308b\u306a\u3089\u7406\u5c48\u304c\u7acb\u3061\u307e\u3059\u3002\u6bce\u65e5\u89e6\u308b\u7269\u307b\u3069\u3001\u6027\u80fd\u5dee\u304c\u305d\u306e\u307e\u307e\u52b9\u7387\u5dee\u306b\u306a\u308a\u307e\u3059\u3002`
      ];
    case "beauty":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u8efd\u304f\u306a\u3044\u3067\u3059\u304c\u3001\u898b\u305f\u76ee\u3092\u6574\u3048\u308b\u8cbb\u7528\u306f\u30bc\u30ed\u306b\u306f\u3067\u304d\u307e\u305b\u3093\u3002\u6bce\u671d\u306e\u8ff7\u3044\u304c\u6e1b\u308b\u306a\u3089\u3001\u601d\u3063\u305f\u3088\u308a\u5b9f\u7528\u3067\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u305c\u3044\u305f\u304f\u306b\u898b\u3048\u3066\u3082\u3001\u8eab\u3060\u3057\u306a\u307f\u3092\u96d1\u306b\u3057\u306a\u3044\u305f\u3081\u306e\u51fa\u8cbb\u3067\u3059\u3002\u4f7f\u3046\u305f\u3073\u306b\u6574\u3044\u3084\u3059\u3044\u306a\u3089\u3001\u5341\u5206\u56de\u53ce\u3067\u304d\u307e\u3059\u3002`
      ];
    case "living":
      return [
        `${context.item}\u306b${context.formattedAmount}\u306f\u5927\u304d\u3081\u3067\u3082\u3001\u5bb6\u3067\u6bce\u65e5\u4f7f\u3046\u7269\u306f\u5143\u3092\u53d6\u308a\u3084\u3059\u3044\u3067\u3059\u3002\u3061\u3087\u3063\u3068\u3057\u305f\u4e0d\u4fbf\u3092\u6bce\u65e5\u53d7\u3051\u308b\u65b9\u304c\u3001\u3042\u3068\u3067\u52b9\u3044\u3066\u304d\u307e\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u751f\u6d3b\u8cbb\u3068\u3057\u3066\u306f\u91cd\u3044\u3067\u3059\u304c\u3001\u4f7f\u3046\u305f\u3073\u306b\u624b\u9593\u304c\u6e1b\u308b\u306a\u3089\u5341\u5206\u7406\u7531\u306b\u306a\u308a\u307e\u3059\u3002`
      ];
    default:
      if (context.amount >= 10000) {
        return [
          `${context.item}\u306b${context.formattedAmount}\u306f\u5b89\u304f\u306a\u3044\u3067\u3059\u304c\u3001\u3061\u3083\u3093\u3068\u4f7f\u3046\u524d\u63d0\u306a\u3089\u8a71\u306f\u5909\u308f\u308a\u307e\u3059\u3002\u4f7f\u3046\u305f\u3073\u306e\u5c0f\u3055\u306a\u4e0d\u6e80\u304c\u6e1b\u308b\u306a\u3089\u3001\u610f\u5916\u3068\u5143\u306f\u53d6\u308a\u3084\u3059\u3044\u3067\u3059\u3002`,
          `${context.formattedAmount}\u306e${context.item}\u306f\u5f37\u3081\u3067\u3082\u3001\u51fa\u756a\u304c\u591a\u3044\u306a\u3089\u5341\u5206\u56de\u53ce\u3067\u304d\u307e\u3059\u3002\u5b89\u304f\u6e08\u307e\u305b\u3066\u4f55\u5ea6\u3082\u8cb7\u3044\u76f4\u3059\u3088\u308a\u3001\u3080\u3057\u308d\u5206\u304b\u308a\u3084\u3059\u3044\u3067\u3059\u3002`
        ];
      }
      return [
        `${context.item}\u306b${context.formattedAmount}\u306a\u3089\u3001\u5927\u3052\u3055\u306a\u51fa\u8cbb\u3067\u306f\u3042\u308a\u307e\u305b\u3093\u3002\u5c11\u984d\u3067\u3082\u3061\u3083\u3093\u3068\u6e80\u8db3\u3057\u3066\u7d42\u308f\u308c\u305f\u306a\u3089\u3001\u305d\u308c\u306a\u308a\u306b\u610f\u5473\u306f\u3042\u308a\u307e\u3059\u3002`,
        `${context.formattedAmount}\u306e${context.item}\u306f\u8efd\u3044\u8cb7\u3044\u7269\u3067\u3082\u3001\u6c17\u5206\u8ee2\u63db\u3084\u624b\u9593\u306e\u524a\u6e1b\u306b\u3064\u306a\u304c\u308b\u306a\u3089\u5341\u5206\u3067\u3059\u3002`
      ];
  }
}

function buildState(item, amount) {
  const context = buildContext(item, amount);
  return {
    candidates: pickUnique(linesFor(context)),
    index: 0
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

  return { item, amount: Math.round(amount) };
}

function showResult(text) {
  lastExcuse = text;
  resultText.textContent = text;
  resultMeta.textContent = "";
  resultMeta.classList.add("hidden");
  resultSection.classList.remove("hidden");
}

function nextExcuse() {
  if (!currentState || currentState.candidates.length === 0) {
    return;
  }
  const text = currentState.candidates[currentState.index];
  currentState.index = (currentState.index + 1) % currentState.candidates.length;
  showResult(text);
}

function generateExcuse() {
  const validated = validateInputs();
  if (!validated) {
    return;
  }

  showStatus(TEXT.thinking);
  currentState = buildState(validated.item, validated.amount);
  hideStatus();

  if (!currentState.candidates.length) {
    showGenerationError(TEXT.generationFailed);
    return;
  }

  nextExcuse();
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
