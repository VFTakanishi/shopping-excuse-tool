const APP_VERSION = "2026.07.16-short-1";

const form = document.getElementById("excuse-form");
const itemNameInput = document.getElementById("item-name");
const amountInput = document.getElementById("amount");
const itemError = document.getElementById("item-error");
const amountError = document.getElementById("amount-error");
const resultSection = document.getElementById("result-section");
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

const recentExcusesByKey = new Map();
let lastExcuse = "";
let copyTimerId = null;

const BANNED_EMPTY_JUSTIFICATIONS = [
  "欲しかったから問題ない",
  "自分が納得しているならよい",
  "生活に支障がないならよい",
  "完璧な理由は必要ない",
  "好きならそれでよい",
  "気分が上がるなら十分",
  "無駄とは限らない",
  "自分への投資",
  "理屈を盛りすぎなくてよい",
  "自分の判断を優先した",
  "それで十分です"
];

const GENERIC_NAME_MESSAGES = new Map([
  ["商品", "何を買ったのか分かる名前にすると、言い訳もそれっぽくなります。"],
  ["用品", "用品だけだと広すぎます。もう少し具体的に入れてください。"],
  ["部品", "部品だけだと雑すぎます。何の部品か入れてください。"],
  ["サービス", "サービスだけだと広すぎます。何のサービスか入れてください。"],
  ["グッズ", "グッズだけだと曖昧です。何のグッズか入れてください。"],
  ["アイテム", "アイテムだけだと広すぎます。中身が分かる名前で入れてください。"],
  ["もの", "もの、だけだと範囲が広すぎます。何を買ったか入れてください。"],
  ["やつ", "やつ、だと判定できません。商品名をもう少し具体的にしてください。"]
]);

const PRICE_THRESHOLDS = {
  stationery: { low: 300, normal: 1500, high: 10000 },
  food: { low: 1000, normal: 5000, high: 20000 },
  transport: { low: 1500, normal: 8000, high: 20000 },
  premiumTransit: { low: 5000, normal: 15000, high: 40000 },
  vehiclePurchase: { low: 300000, normal: 1500000, high: 5000000 },
  carMaintenance: { low: 15000, normal: 120000, high: 300000 },
  carCustom: { low: 30000, normal: 150000, high: 400000 },
  device: { low: 3000, normal: 30000, high: 120000 },
  repair: { low: 5000, normal: 30000, high: 100000 },
  fashion: { low: 5000, normal: 30000, high: 100000 },
  beauty: { low: 3000, normal: 10000, high: 50000 },
  health: { low: 3000, normal: 10000, high: 40000 },
  entertainment: { low: 2000, normal: 8000, high: 30000 },
  creatorSupport: { low: 3000, normal: 15000, high: 80000 },
  living: { low: 3000, normal: 15000, high: 50000 },
  timeSavingService: { low: 5000, normal: 12000, high: 30000 },
  subscription: { low: 1000, normal: 3000, high: 10000 },
  event: { low: 3000, normal: 10000, high: 40000 },
  genericProduct: { low: 2000, normal: 10000, high: 50000 },
  genericService: { low: 3000, normal: 10000, high: 50000 }
};

const CATEGORY_LABELS = {
  stationery: "文房具",
  food: "食事",
  transport: "移動",
  premiumTransit: "移動",
  vehiclePurchase: "自動車購入",
  carMaintenance: "車の整備・修理",
  carCustom: "車のカスタム",
  device: "家電・デジタル",
  repair: "修理",
  fashion: "ファッション",
  beauty: "美容",
  health: "健康",
  entertainment: "娯楽",
  creatorSupport: "応援",
  living: "家具・生活用品",
  timeSavingService: "時短サービス",
  subscription: "サブスク",
  event: "イベント",
  genericProduct: "一般商品",
  genericService: "一般サービス"
};

const SUBTYPE_RULES = [
  { subtype: "hotelLunch", category: "food", keywords: ["ホテルランチ"] },
  { subtype: "mobileGameCharge", category: "entertainment", keywords: ["スマホゲーム課金", "ゲーム課金", "ガチャ課金"] },
  { subtype: "pcGame", category: "entertainment", keywords: ["pcゲーム", "steam", "switchソフト", "ps5ゲーム", "ゲームソフト"] },
  { subtype: "spacha", category: "creatorSupport", keywords: ["スーパーチャット", "super chat", "スパチャ", "投げ銭", "youtube投げ銭", "配信者支援"] },
  { subtype: "sponsorFrame", category: "creatorSupport", keywords: ["スポンサー枠", "スポンサー費", "協賛"] },
  { subtype: "greenCar", category: "premiumTransit", keywords: ["グリーン車", "新幹線グリーン車", "プレミアムシート", "ファーストクラス", "ビジネスクラス"] },
  { subtype: "medicationApp", category: "subscription", keywords: ["服薬管理アプリ"] },
  { subtype: "bicycleRepair", category: "repair", keywords: ["自転車修理"] },
  { subtype: "wheelchairRepair", category: "repair", keywords: ["車椅子修理"] },
  { subtype: "clockRepair", category: "repair", keywords: ["置き時計修理"] },
  { subtype: "vehiclePurchase", category: "vehiclePurchase", keywords: ["軽自動車", "中古車", "乗用車", "車両購入", "セカンドカー", "自動車"] },
  { subtype: "carCustom", category: "carCustom", keywords: ["車高調", "マフラー", "ホイール", "スポイラー", "ダウンサス"] },
  { subtype: "carMaintenance", category: "carMaintenance", keywords: ["車検", "エンジン修理", "オイル交換", "タイヤ交換", "ブレーキ", "バッテリー交換", "自動車修理"] },
  { subtype: "smartphoneRepair", category: "repair", keywords: ["スマホ修理", "iphone修理", "ipad修理", "画面修理"] },
  { subtype: "fashionRepair", category: "repair", keywords: ["靴修理", "バッグ修理", "服修理", "置き時計修理"] },
  { subtype: "morning", category: "food", keywords: ["モーニング"] },
  { subtype: "seafoodBowl", category: "food", keywords: ["海鮮丼"] },
  { subtype: "yakiniku", category: "food", keywords: ["焼肉"] },
  { subtype: "foodGeneric", category: "food", keywords: ["寿司", "ラーメン", "ランチ", "ディナー", "定食", "海鮮", "ごはん", "食事"] },
  { subtype: "taxi", category: "transport", keywords: ["タクシー"] },
  { subtype: "transportGeneric", category: "transport", keywords: ["新幹線", "バス", "電車", "ガソリン", "駐車場", "移動"] },
  { subtype: "charger", category: "device", keywords: ["充電器", "モバイルバッテリー"] },
  { subtype: "airpods", category: "device", keywords: ["airpods pro", "airpods"] },
  { subtype: "laptop", category: "device", keywords: ["ノートpc", "ノートパソコン", "macbook", "laptop", "ゲーミングpc", "パソコン", "pc"] },
  { subtype: "hairOil", category: "beauty", keywords: ["ヘアオイル"] },
  { subtype: "salon", category: "beauty", keywords: ["美容院", "ヘアサロン", "美容室"] },
  { subtype: "gym", category: "health", keywords: ["ジム月会費", "ジム", "フィットネス"] },
  { subtype: "seitai", category: "health", keywords: ["整体", "マッサージ"] },
  { subtype: "movieTicket", category: "entertainment", keywords: ["映画チケット", "映画"] },
  { subtype: "eventGeneric", category: "event", keywords: ["ライブチケット", "美術館", "コンサート", "舞台", "フェス", "イベント"] },
  { subtype: "pencil", category: "stationery", keywords: ["鉛筆", "えんぴつ"] },
  { subtype: "pen", category: "stationery", keywords: ["ボールペン", "シャーペン", "万年筆", "ペン"] },
  { subtype: "hat", category: "fashion", keywords: ["帽子", "キャップ", "ハット"] },
  { subtype: "coat", category: "fashion", keywords: ["コート", "ジャケット", "デニム", "服"] },
  { subtype: "bag", category: "fashion", keywords: ["バッグ", "カバン", "リュック", "トート"] },
  { subtype: "sneakers", category: "fashion", keywords: ["スニーカー", "靴"] },
  { subtype: "chair", category: "living", keywords: ["椅子", "チェア"] },
  { subtype: "mug", category: "living", keywords: ["マグカップ", "コップ", "カップ"] },
  { subtype: "umbrella", category: "living", keywords: ["傘"] },
  { subtype: "housekeeping", category: "timeSavingService", keywords: ["家事代行", "掃除代行", "時短サービス"] },
  { subtype: "subscriptionGeneric", category: "subscription", keywords: ["月会費", "月額", "サブスク", "netflix", "spotify", "amazon prime", "youtube premium"] },
  { subtype: "dailyGoods", category: "living", keywords: ["フライパン", "収納箱", "食器", "キッチン用品", "家具", "収納"] }
];

const CATEGORY_FALLBACKS = {
  stationery: "pencil",
  food: "foodGeneric",
  transport: "transportGeneric",
  premiumTransit: "greenCar",
  vehiclePurchase: "vehiclePurchase",
  carMaintenance: "carMaintenance",
  carCustom: "carCustom",
  device: "laptop",
  repair: "smartphoneRepair",
  fashion: "coat",
  beauty: "salon",
  health: "seitai",
  entertainment: "pcGame",
  creatorSupport: "spacha",
  living: "chair",
  timeSavingService: "housekeeping",
  subscription: "subscriptionGeneric",
  event: "eventGeneric"
};

const TEMPLATE_MAP = {
  pencil: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、書きにくい一本を我慢するより安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、手元が少し気持ちよくなる料金としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、なくさず最後まで使えば普通に勝ちです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎回ちょっと書きやすいなら地味に回収できます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、文房具というより手元の小改善代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、書くたび気分が少し上がるなら話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、もう文房具というより趣味です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、書く機能より持っていたい気持ちに払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると完全に手元のロマン代です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、文房具代ではなくコレクション代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、書くためより眺めるための買い物です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。もう鉛筆の顔をした趣味として処理します。`
    ]
  },
  pen: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、インクが出ない一本を振り続ける時間より安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、ちゃんと書けるだけで十分仕事をしています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、最後まで使い切れた時点で普通に元は取れます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎回触る物として見ればまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、書くたび小さく機嫌が直る持ち物代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、安いペンを買い直す面倒を止めたと思えばまだ自然です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、インク代ではなく持ち物代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで来ると、字を書く機能より所有感に払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、仕事道具というより気分の装備です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、字を書くためではなく高い物で字を書くための買い物です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、もう筆記具ではなく趣味の証拠です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。実用品ではなく完全にロマン枠です。`
    ]
  },
  morning: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、朝を自分で立て直す料金としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、寝ぼけたまま何とか始動した代としては安いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、朝の段取りを一回省いた料金として話せます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、朝の席代まで込みならまだ分かります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、朝食というより朝を整えた費用です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、食事代と場所代をまとめて払ったと思えばまだ自然です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。その日は朝食より朝イベントでした。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、朝を食べたというより朝に張り切りすぎています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は普通の朝食ではありません。朝から何かをやり切った料金です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は朝食ではありません。朝から大きなことをした料金です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、もうモーニングではなくネタです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高すぎますが、その日の朝を忘れない費用にはなります。`
    ]
  },
  seafoodBowl: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、魚を切って片付けるより話が早いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、満足まで一直線ならむしろ手早いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、食べたい物に最短で着地した代としては自然です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、食事代というより魚の面倒を全部省いた料金です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、自分で寄せ集めるより一発で終わる方が楽です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高すぎるほどではなく、満足を早く買った感じです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、その日は昼食というよりご褒美寄りです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、味だけでなく気分転換まで込みで払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、普通の丼より今日はこれでいい日にした料金です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は食事代ではなくネタ代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、昼食の顔をしたイベントです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。味より記憶に残す方向の出費です。`
    ]
  },
  yakiniku: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、焼く手間まで任せた料金としては普通です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、その場で満足して終われるなら安い方です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、肉を食べたい気分を即終了させた代です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、食事代というよりその場のイベント代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、家で煙を出さずに済んだ分も込みです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、焼くところまで外注したと思えばまだ話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、その日は食事ではなくイベントだったことにします。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、肉代というより今日はこういう日だ代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも普通の夕飯と比べる段階はもう過ぎています。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は夕飯ではありません。完全に出来事です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、焼肉の形をした記念日です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。食事代ではなく話のネタ代として整理します。`
    ]
  },
  foodGeneric: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、空腹をすぐ止めた料金としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、自分で段取りするより早く終わります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回ちゃんと満足した時点で十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、食事と手間をまとめて払った感じです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、作るより早く終わるならまだ自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、その場で完結したならまあ話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。その日は食事というよりイベント寄りです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、味だけでなく気分転換にも払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、普通の昼食と比べる段階はもう過ぎています。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は食事代ではなくネタ代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、完全に食べるイベントです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。味より記憶に残す方向の出費です。`
    ]
  },
  taxi: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、歩かずに済んだ時間込みです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、迷う時間を金で止めたと思えば早いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、しんどい移動を一回ショートカットした代です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、乗り換えを消した料金だと思えば分かります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、荷物と疲れをまとめて運んでもらった感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、歩く気力がない日に時間を買った代としては自然です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、予定を崩さない費用だと思えばまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、移動代というより体力温存費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でもその分、着いた後にまだ動けます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}はかなり高いです。移動そのものを丸ごと買った感じです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、運賃より今日は楽を買っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、予定を守る罰金だと思えばまだ整理できます。`
    ]
  },
  greenCar: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、少し静かに移動する料金としてはまだ穏やかです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、座る場所を整えた分としては話せます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、移動で消える元気を少し守る代です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、ぜいたくというより移動で削れないための費用です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、座席代ではなく到着後にちゃんと動くための料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めでも、移動でぐったりしないなら十分話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、目的地で使い物になるなら必要経費寄りです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、移動の快適さより到着後の自分に払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも移動で一日終わるよりは安いです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}はかなり高いです。もう移動というより体力の保全費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、席代より疲れない権利代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、目的地で潰れないなら理屈は立ちます。`
    ]
  },
  transportGeneric: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、移動の面倒を少し消した代としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、歩く時間を削ったと思えば早いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、迷わず着いた時点で十分元は取れます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、移動費というより時間を買った感じです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、荷物と疲れを減らした代としては自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めでも、予定を崩さないならまあ話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、移動後にまだ動けるなら意味はあります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、運賃というより体力温存費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも移動で消耗し切るよりはましです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}はかなり高いです。今日は移動を丸ごと外注しています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、交通費より予定維持費の顔です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、時間も体力も守る方に振った出費です。`
    ]
  },
  vehiclePurchase: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は安いです。本番は修理費ですが、動けば移動手段としては強いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、車両価格より維持費の確認が先です。それでも使えれば話は立ちます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、安いから即得ではありません。ただ動けばタクシー数回分より自由です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、購入額だけでなく総額で見る買い物です。それでも移動を一本化できるなら自然です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、維持費込みで考えても荷物や時間帯の自由が残ります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、通勤や送迎や買い物をまとめられるなら説明できます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。移動費だけでなく、好きで持つ分も入っています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、タクシーやレンタカーとの比較だけでは片付きません。趣味枠もあります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、使う期間で割ると移動手段を持つ意味はまだ残ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は移動だけでは説明しきれません。完全に好きな物としての比率も高いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、維持費込みの総額で向き合う買い物です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。ただ売却や使用期間まで含めて見る買い物ではあります。`
    ]
  },
  carMaintenance: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、動かなくなる前に払った代としては安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、後で大きく壊すよりずっと話が早いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、車を止めないための小さい出費として自然です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、動かない日を作らないための費用です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、今ある車を使い続けるための必要経費として通ります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、買い替えの話になる前に止めた料金と思えばまだましです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、車を買い替える話よりは小さく済む可能性があります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、修理費というより延命費として見る方がしっくりきます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は痛いですが、ここで止めれば総額が暴れすぎずに済みます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}はかなり高いです。それでも車両入れ替えより小さいならまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、修理費というより今の車を続投させる判断です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで直すなら使い切る前提の出費です。`
    ]
  },
  carCustom: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、少額で見た目か感触を変えた代としてはありです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、触るたび気付ける変化ならまだ軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、車を少しだけ自分寄りにした料金として話せます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、安物を何度も試すより一回で決めた感じです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、移動費ではなく趣味代として処理するのが素直です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、車を見るたび回収するタイプの出費です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、気になる状態を長く引きずるより早いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、移動手段より趣味の装備として払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも見るたび納得できるなら回収先はあります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は完全に移動費ではありません。車趣味の本体です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、純正で我慢する費用を先払いした感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。合理性より満足を優先した枠です。`
    ]
  },
  charger: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、充電できない時間の方が面倒です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、ケーブルを探してイライラするより安いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、不便を一個消した代としては軽いです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎回ちゃんと使えるなら話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、安い物を買い直す未来を先に止めた感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、充電待ちの面倒を減らした料金としてはまだ自然です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。ここまで来ると充電器というよりガジェット趣味です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、電気を入れる道具より満足感に払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、毎日目に入る機械としてはまだ説明できます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、電気を入れる道具の値段ではありません。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、完全に充電器の顔をした趣味です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。便利さより所有欲の比率が高いです。`
    ]
  },
  airpods: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、耳まわりを少し楽にした代としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、配線の面倒を消した料金として話せます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一日の小さな雑音を減らす代としては自然です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎日耳につけるならまだ説明できます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、イヤホン代というより騒音を少し消す料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、使うたび配線ストレスが消えるなら十分話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、毎日使う時間が長いなら回収先はあります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、音だけでなく面倒の少なさにも払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも耳まわりが快適になるなら納得しやすいです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。イヤホンというより快適さの装備です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、音より使い勝手に払う比率が大きいです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、毎日触る物としてはまだ筋は通ります。`
    ]
  },
  laptop: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、不便を一個減らした料金としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、待ち時間にイライラしないだけでも十分です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、機械の機嫌を取る時間を減らした代です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎日使う時間が長いならまだ自然です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、安い機械を買い直すより一台で済ませたい出費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、作業待ちを減らした料金としては十分説明できます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、待ち時間にキレないための費用と思えばまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、性能だけでなく毎日のストレス減にも払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも長く触る機械なら安物より筋が通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。実用品と趣味の境目に立っています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、性能と満足感の合算で考える買い物です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、毎日使う道具としてはまだ説明可能です。`
    ]
  },
  smartphoneRepair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、新しい端末を探す手間より軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、使えない時間を短くした料金として自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、設定し直しを避けた代として十分話せます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、買い替えよりまだ小さく済む話です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、今の環境をそのまま延命した料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、データ移行の面倒を回避したと思えばまだ安いです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、新品探しより早く戻るなら意味があります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、修理費というより今の生活を止めない代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも環境を作り直すよりは筋が通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。買い替えと比べて初めて判断する帯です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、修理費より継続費の顔になっています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、今の端末に残したい環境があるなら話せます。`
    ]
  },
  bicycleRepair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、新車を見る前に止められる額です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、押して帰る未来を避けた代としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、また普通に乗れる時点で十分話せます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、買い直すよりはだいぶ穏やかです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、今ある一台を続投させる料金として自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、移動手段を止めないための費用として話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、また探し直すより話が早いなら十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、修理費というより買い直し回避費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも乗れる状態に戻るなら筋は通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。新品比較まで入れて考える帯です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、延命というより続投判断です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、使い慣れた移動手段を残す費用ではあります。`
    ]
  },
  wheelchairRepair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、動きづらさを先に止めた代としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、そのまま我慢するより話が早いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、また普通に使える時点で十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、使えない時間を増やさない費用として自然です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、買い直しより今の状態を戻す方が話しやすいです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、使い慣れた物を止めないための料金です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、必要な物をそのまま使い続ける費用としては筋が通ります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、修理費というより使える状態の維持費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも使えない時間を延ばすよりは自然です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。買い替え比較まで入れて考える帯です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、修理というより継続利用の判断です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、使える状態を保つ費用としては説明できます。`
    ]
  },
  clockRepair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、新しい時計を探すより静かに済みます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、気に入った物をそのまま置ける代として軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、また動けば十分役目は果たしています。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、買い直しと配置し直しをまとめて避けた料金です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、気に入った景色を崩さない費用として自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、また同じ物を探すよりは話が早いです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、気に入った物を残す費用としてはありです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、時計代より探し直し回避費の顔です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも置いた景色を変えずに済みます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。新品比較込みで考える修理です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、時間を見る道具より愛着維持費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、気に入った物を残したいなら話せます。`
    ]
  },
  fashionRepair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、気に入った物をもう少し使う料金として軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、新品探しを一回飛ばした代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、また慣らし直す面倒を避けたと思えば自然です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、買い直しより話が早いなら十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、使い慣れた物を延命した料金として通ります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、また同じ物を探す面倒を止めた代です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、気に入った物を続投させる費用としてはありです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、修理費というより買い直し回避費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも馴染んだ物を残す方が楽な時もあります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。新品比較まで入れて判断する帯です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、延命というより愛着維持費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、また探し直す手間が重いならまだ話せます。`
    ]
  },
  hat: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回出番があればそこまで重くありません。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、髪型を考える時間を少し減らせます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、今日はこれでいいを作る料金としては軽いです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、合わせやすいなら十分回せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、服装に迷う時間を短くする代として自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、何回か助けてくれた時点でだいぶ元は取れます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、服より顔の近くで効くので意外と目立ちます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、布代というより見た目の調整代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも被るだけでまとまるなら話は早いです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は帽子代ではなく趣味代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、日除けより満足感に払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。実用品より持ちたい気持ちが勝っています。`
    ]
  },
  coat: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一着で外に出やすくなるなら軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、防寒と見た目を一回で済ませた感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、これを着れば終わるを買った代です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、冬の主役なら十分出番があります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、他の服を細かく足さずに済む方が楽です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、寒さ対策と見た目をまとめて払った感じです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、冬に毎回使うならまだ説明できます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、防寒具だけでなく見た目代もちゃんと入っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも一番上に着る物は意外と回収先が多いです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は服代より趣味代の比率が高いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、防寒より所有感に払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。実用品だけでは説明しきれません。`
    ]
  },
  bag: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、荷物がまとまるだけでも十分仕事をしています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、毎回これで済むならかなり楽です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、手ぶらで困る回を減らす代としては軽いです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、服に合わせやすいなら出番で回収できます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、毎回バッグ選びで止まらない料金として自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、荷物がまとまって見た目も整うなら十分話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、毎回これで済むなら意外と強いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、入れ物代というより合わせやすさ代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも荷物がまとまって服にも合うなら話は立ちます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、収納より趣味の比率が高いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、荷物を入れる道具ではなく満足感です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。実用品の顔をしたロマン枠です。`
    ]
  },
  sneakers: {
    low: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}なら、100回お出かけすれば1回あたり${formatCurrency(Math.ceil(amount / 100))}です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、歩きにくい靴を我慢するよりは安いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、出かける気分を少し上げる代としては軽いです。`
    ],
    normal: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}は高めですが、100回お出かけすれば1回あたり${formatCurrency(Math.ceil(amount / 100))}です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、よく履く一足として考えればまだ無茶ではありません。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、服より悩まず履けるなら十分回せます。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}は高いですが、100回履くなら1回あたり${formatCurrency(Math.ceil(amount / 100))}です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、靴代というより出かける気分の装備代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でもよく履く一足ならまだ説明できます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、普段靴というより完全に趣味です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、歩く道具より持っていたい気持ちに払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。実用品だけで片付ける帯ではありません。`
    ]
  },
  salon: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、自分で切って後悔するより安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、朝の整えやすさを先に買った感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、手直し回避費としては普通に軽いです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、身支度を楽にするなら十分話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、自分で失敗しないための料金として自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、切る代というより整えやすさ代です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、長く悩む時間を一回で止めた感じです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、髪を切ったというより手入れを楽にする費用です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも毎朝の面倒が減るなら話せます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。美容というよりイベント枠です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、整える以上のことをしに行っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、長く引きずる悩みを止める費用ではあります。`
    ]
  },
  hairOil: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、朝のまとまりが少し楽になる料金としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、髪が暴れる朝の小さい保険です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、使い切れた時点で普通に仕事はしています。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎朝迷わず使えるなら十分話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、髪の機嫌を少し安定させる代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、一本で朝の手数を減らせるなら自然です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると効果より気分の比率も入っています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、整える油というより朝を急がせる道具です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも毎日触る物ならまだ説明できます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。ヘアケアの顔をした趣味枠です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、髪より満足感にも払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、朝の気分を整える装備としては筋が通ります。`
    ]
  },
  seitai: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、痛いまま一日機嫌が悪いより安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、不調を放置しない料金としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回ちょっと楽になるだけでも話は立ちます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、体が少し楽ならその日の生産性で回収を狙えます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、だるさを長引かせない費用として自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、不調を翌日に持ち越さないための料金と思えば話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、楽になって動けるなら結果的に得しやすいです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、体を整えて仕事しやすくする費用として筋は通ります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも不調を引きずる方が面倒です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。ここまで来ると施術代というより不調停止費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、その日のコンディション立て直しに大きく払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、体が楽になればまだ回収先はあります。`
    ]
  },
  gym: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、家から出る理由代としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、一回体を動かした時点で完全敗北ではありません。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、運動のきっかけを買ったと思えば自然です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、筋肉代ではなくサボりにくくする料金です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、運動する場所を先に確保した費用として通ります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、行く理由が増えるならまだ話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、運動しないまま月を終えるよりはましです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、健康そのものではなく行動の仕組みに払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも外に出る装置としては筋が通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。筋トレ代より、逃げにくくする費用です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、運動より自分の逃げ道封じに払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、行く仕組みとして見るとまだ説明できます。`
    ]
  },
  medicationApp: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、飲み忘れを減らす道具としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、思い出す手間を外注した感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回でもちゃんと役に立てば十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、管理の面倒を減らすなら自然です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、薬そのものではなく忘れにくくする料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、毎回確認する手間を減らす代として話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、続けやすさを買ったと思えばまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、アプリ代というより管理の手間止め費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも忘れ物を減らす道具としては筋が通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。機能だけでなく安心感にも払っています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、記録アプリというより管理の本気装備です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、毎日の確認を外す費用としては説明できます。`
    ]
  },
  pcGame: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、数時間遊べれば普通に回収できます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、外に出ずに遊べた日の娯楽費としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回ちゃんと笑えた時点で十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、映画を何本か見る時間遊べればかなり自然です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、家で完結する娯楽としてはまだ穏やかです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、長く触るならちゃんと回収先があります。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、外出イベント一回分と思えばまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、遊ぶための時間を家で確保した費用です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも娯楽費としてはまだ整理しやすいです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。ゲーム代というよりしばらく遊ぶ権利代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、趣味としてかなり本気の帯です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、外遊び何回分かと比べるとまだ整理できます。`
    ]
  },
  mobileGameCharge: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、遊んだ日の娯楽費としてはまだ軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、見て終わるより一回ちゃんと参加した感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、物は残らなくてもその日の遊び代としては自然です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、外出せず遊んだ日の娯楽費としてはまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、強くなる代というより楽しみ方を増やした料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、形に残らないことを認めても娯楽費としては整理できます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。もうゲーム代というよりテンション代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、遊びの勢いにちゃんと金額がついた感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、外で散らすより家で完結した娯楽費です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強くなる料金ではありません。後に引けなくなった記念費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、完全に娯楽予算の本気枠です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。物は残らないので、せめて話のネタにはします。`
    ]
  },
  movieTicket: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、数時間ちゃんと別世界に行ければ十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、家にいない理由を作った代としては自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回ちゃんと集中できた時点で回収できます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、席と時間をまとめて買ったと思えば普通です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、その日の予定を一つきれいに埋めた料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、物は残らなくても二時間借りた感じで話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、その日は映画というより外出イベントです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、内容だけでなく出かけた分まで込みです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも一日をちゃんと使った感は残ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、映画代よりイベント代の顔です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、映像を見るより記念日寄りです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。作品代だけではもう説明しません。`
    ]
  },
  eventGeneric: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、その日の予定を一個きれいに作れます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、家にいるより話のネタは増えます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、参加権としては十分話せます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、物代ではなくその日にそこへ行く権利代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、同じ機会を後から作りにくい分だけ筋は通ります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、参加した時点で目的は果たしています。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、一回しか使えないからこそ話は単純です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、イベントというより記念日の比率が高いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも後から同じ日を買い直せません。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。体験代より記録代の顔になっています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、参加費より思い出の本気枠です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、一回で終わるからこそ用途ははっきりしています。`
    ]
  },
  spacha: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、配信を見た料金にコメント代を乗せたくらいです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、見て終わらず応援を形にした代としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、配信参加費としてはまだ穏やかです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、配信への支援とメッセージ代をまとめた感じです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、細かく何度も投げる代わりに一回で応援を置いた感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、物は残らなくても娯楽費と支援費の合算として話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、もうコメント代ではなくスポンサー費寄りです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、配信を見た代より応援予算の本体に近いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも応援費として分けているなら話はまだ通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。物代ではなく、名前を出して応援した記録代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、配信参加費より完全に支援費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、年間の応援予算で見るならまだ整理可能です。`
    ]
  },
  sponsorFrame: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、応援を見える形にした費用としてはまだ軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、物代ではなく名前を出した支援費として話せます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、娯楽費より支援費に近い出費です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、商品代ではなくスポンサー費として見る方が自然です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、応援予算を一回で使った形としては整理できます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、物が残らない代わりに支援の記録はちゃんと残ります。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、もう娯楽費よりスポンサー費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、名前を出して応援した記録代として見るのが素直です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも支援先がはっきりしている分だけ散財より話は早いです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}はかなり高いです。商品代ではなく完全にスポンサー費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、応援予算の本気枠として扱うしかありません。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、応援費として切り分けるならまだ話せます。`
    ]
  },
  chair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、床に座るより楽な時点で十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、座る場所をちゃんと確保した代として軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回姿勢がましになるだけでも話せます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎日座るなら家の中でかなり出番があります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、家具代というより作業姿勢代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、数時間座る物として見るとそこまで変ではありません。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、毎日使う席なら回収先はかなり多いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、部屋の中心に払ったと思えばまだ話せます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも座るたび機嫌がましなら十分です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、家具というより生活環境そのものに払っています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、椅子代より居場所代の顔です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、長く触れる物として考える帯です。`
    ]
  },
  mug: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回でもちゃんと使えば十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、家で飲む気分を少し整える代として軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、毎朝の小さい機嫌代としては自然です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎日目に入る物ならまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、飲み物代ではなく見る物への課金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、使うたびちょっと気分が上がるなら十分です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると食器より趣味寄りです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、飲む道具というより机の景色代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも毎日見る物ならまだ説明できます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、飲み物代ではなく完全に趣味代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、もう器より満足感に払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。実用品の顔をしたコレクションです。`
    ]
  },
  umbrella: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、濡れて機嫌が終わるより安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、一回ちゃんと防げば十分役目は果たしています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、急な雨の罰金を先に払った感じです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、壊れて買い直す回数が減るなら自然です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、びしょびしょ回避費としてはかなり素直です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、雨の日の面倒を減らす道具として話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると雨具より気分の装備です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、濡れない以上に持ちたい気持ちにも払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも雨の日の不機嫌を減らすなら筋は通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は傘代というより趣味代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、雨を防ぐ道具の相場からは完全に出ています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。実用品より所有したい気持ちが主役です。`
    ]
  },
  housekeeping: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、苦手な家事を一回外した料金としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、休日を全部掃除で潰さない代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、時間を買ったと言ってそこまで無理はありません。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、掃除代というより休日を守った料金です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、自分でやるより早く片付くなら十分自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、苦手作業を外注したと思えば話せます。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、家事ではなく休みを買ったと思えば整理しやすいです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、疲れている日に生活を崩さないための費用です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも休日を作業で潰すよりは話が早いです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。家事代より生活立て直し費の顔です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、作業ではなく自由時間を取り戻しに行っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、崩れた生活を戻す用途ならまだ話せます。`
    ]
  },
  subscriptionGeneric: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回使った時点でそこまで赤字ではありません。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、都度払う手間を消した代としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、解約を忘れなければ普通に穏やかです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎回払う面倒を省けるなら自然です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、月の中で何回か使えばまだ話せます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、使い道がある月ならそこまで変ではありません。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。使っていないと厳しいので、使う前提で押し切ります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、便利さより解約し忘れとの戦いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、複数回使う月ならまだ立て直せます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。ここまで来ると使うかどうかがすべてです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、サブスクというより固定費の本気枠です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、忘れず使えばまだ話は残ります。`
    ]
  },
  hotelLunch: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、少し丁寧な昼にした代としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、席と空気まで込みで考えれば自然です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、昼食を少しイベント化した料金です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、食事と場所代をまとめた感じです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、宿泊ではなく昼の気分転換として話せます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、ホテルを使った昼食として見るならまだ自然です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、昼食というより小さいイベントです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、味だけでなく場の料金まで込みです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも昼の予定をきれいに作れています。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は昼食代ではなくイベント代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、ランチというより記念日の顔です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。普通の昼ごはん比較はもうやめます。`
    ]
  },
  dailyGoods: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回ちゃんと使えば十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、小さい不便を一つ消した代として軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、家の中の面倒を少し減らす料金として自然です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎日触るならまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、買い直しを減らす方に振った感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、使うたび地味に楽になるなら十分です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると便利さと気分の合算です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、実用品の顔をした趣味寄りの出費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも毎日見る物なら回収先はあります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。生活用品より満足感の比率が高いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、道具というより生活の景色代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、長く目に入る物として考える帯です。`
    ]
  },
  genericProduct: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、外れても被害がまだ小さいです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、一回でも目的を果たせばかなり十分です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、小さい不便を減らす料金としては軽いです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、安い物を三回買う未来を一回で終わらせた扱いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、ちょっとした面倒を金で止めた料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めでも、使う理由が一個あればまだ通ります。`
    ],
    high: [
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、機能だけでなく気分にも払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも一回で納得したい側の出費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、安い代替を探し続ける時間ごと切っています。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、用途よりネタの方が強いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は実用品代ではありません。完全に趣味か記念です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、普通の買い物としては見ない方が楽です。`
    ]
  },
  genericService: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回面倒が減れば十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、手間を少し外注した料金としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、時間を買ったと言ってそこまで無理はありません。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、自分でやる手間が減るなら話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、作業そのものより面倒回避費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、時間を空けた料金として見ると自然です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、苦手作業を切り離したと思えばまだ話せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、サービス代というより気力温存費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも自分でやるより早いなら筋は通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。もう作業代より生活立て直し費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、時間の買い方としてかなり本気です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、面倒を丸ごと外した費用としては説明できます。`
    ]
  }
};

function normalizeInput(value) {
  return (value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function cleanDisplayItemName(value) {
  return (value || "")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^(?:約)?\d[\d,]*(?:\.\d+)?(?:円|万円|千円)の?/u, "")
    .replace(/^(?:約)?\d[\d,]*(?:\.\d+)?万の?/u, "")
    .trim();
}

function formatCurrency(amount) {
  return `${Number(amount).toLocaleString("ja-JP")}円`;
}

function detectAmbiguousInput(normalizedItemName) {
  if (!normalizedItemName) {
    return "商品名を入力してください。";
  }

  const plain = normalizedItemName.replace(/[0-9.,円万円千円]/g, "").trim();

  for (const [word, message] of GENERIC_NAME_MESSAGES.entries()) {
    if (plain === word) {
      return message;
    }
  }

  if (/^(商品|用品|部品|サービス|グッズ|アイテム)(の.*)?$/u.test(plain)) {
    return "名前が広すぎます。何を買ったのか分かるように入れてください。";
  }

  return "";
}

function detectSpecificExceptions(normalizedItemName) {
  return {
    isBicycleRepair: normalizedItemName.includes("自転車修理"),
    isWheelchairRepair: normalizedItemName.includes("車椅子修理"),
    isHotelLunch: normalizedItemName.includes("ホテルランチ"),
    isHandSoap: normalizedItemName.includes("ハンドソープ"),
    isHairOil: normalizedItemName.includes("ヘアオイル")
  };
}

function detectActionType(normalizedItemName) {
  if (normalizedItemName.includes("修理")) {
    return "repair";
  }

  if (normalizedItemName.includes("会費") || normalizedItemName.includes("月額")) {
    return "subscription";
  }

  return "purchase";
}

function detectRepairContext(normalizedItemName, specificException, actionType) {
  return {
    isRepair: actionType === "repair",
    isVehicleRepair:
      actionType === "repair" &&
      !specificException.isBicycleRepair &&
      !specificException.isWheelchairRepair &&
      /(車|自動車|エンジン|タイヤ|オイル|ブレーキ)/u.test(normalizedItemName)
  };
}

function detectBillingPeriod(normalizedItemName) {
  if (normalizedItemName.includes("月")) {
    return "monthly";
  }

  if (normalizedItemName.includes("年")) {
    return "yearly";
  }

  return "single";
}

function detectConsumableType(normalizedItemName, categoryName) {
  if (categoryName === "food") {
    return "food";
  }

  if (categoryName === "beauty" && normalizedItemName.includes("オイル")) {
    return "beauty";
  }

  return "other";
}

function detectItemType(normalizedItemName) {
  const matched = SUBTYPE_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedItemName.includes(keyword))
  );

  return matched ? matched.subtype : "";
}

function detectCategory(normalizedItemName, repairContext, specificException) {
  if (specificException.isHotelLunch) {
    return "food";
  }

  if (repairContext.isVehicleRepair) {
    return "carMaintenance";
  }

  const matched = SUBTYPE_RULES.find((rule) =>
    rule.keywords.some((keyword) => normalizedItemName.includes(keyword))
  );

  if (matched) {
    return matched.category;
  }

  if (repairContext.isRepair) {
    return "repair";
  }

  if (/(代行|クリーニング|施術|相談|診断|レッスン|サロン)/u.test(normalizedItemName)) {
    return "genericService";
  }

  return "genericProduct";
}

function detectPriceLevel(amount, categoryName) {
  const thresholds = PRICE_THRESHOLDS[categoryName] || PRICE_THRESHOLDS.genericProduct;

  if (amount <= thresholds.low) {
    return "low";
  }

  if (amount <= thresholds.normal) {
    return "normal";
  }

  if (amount <= thresholds.high) {
    return "high";
  }

  return "extreme";
}

function isSpecificProductName(normalizedItemName) {
  return !detectAmbiguousInput(normalizedItemName);
}

function isSpecificServiceName(normalizedItemName) {
  return !detectAmbiguousInput(normalizedItemName);
}

function detectItemTraits(normalizedItemName, categoryName) {
  return {
    subtype: detectItemType(normalizedItemName) || CATEGORY_FALLBACKS[categoryName] || "genericProduct",
    mentionsRepair: normalizedItemName.includes("修理"),
    mentionsMonthly: normalizedItemName.includes("月会費") || normalizedItemName.includes("月額")
  };
}

function uniqueCandidates(list) {
  return [...new Set(list.map((text) => text.trim()).filter(Boolean))];
}

function countSentences(text) {
  return text
    .split(/[。！？]/u)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

function hasMeaningRepetition(text) {
  const normalized = text.replace(/\s+/g, "");
  const repeatedGroups = [
    ["買い直し", "選び直し"],
    ["趣味です", "趣味代"],
    ["時間を買っ", "面倒を金で止め"],
    ["高いです", "強気です"]
  ];

  return repeatedGroups.some((group) => group.filter((word) => normalized.includes(word)).length >= 2);
}

function validateGeneratedText(context, text) {
  const normalized = text.trim();

  if (!normalized) {
    return false;
  }

  if (normalized.length > 120) {
    return false;
  }

  const sentenceCount = countSentences(normalized);
  if (sentenceCount < 1 || sentenceCount > 3) {
    return false;
  }

  if (BANNED_EMPTY_JUSTIFICATIONS.some((phrase) => normalized.includes(phrase))) {
    return false;
  }

  if (hasMeaningRepetition(normalized)) {
    return false;
  }

  if ((normalized.match(/高い/g) || []).length >= 3) {
    return false;
  }

  if (!normalized.includes(context.itemName) && !normalized.includes(context.formattedAmount)) {
    return false;
  }

  return true;
}

function scoreCandidate(context, text) {
  let score = 4;

  if (text.includes(context.itemName)) {
    score += 1;
  }

  if (text.includes(context.formattedAmount)) {
    score += 1;
  }

  if (text.length <= 100) {
    score += 1;
  }

  if (countSentences(text) <= 2) {
    score += 1;
  }

  if (/(趣味|ネタ|記念|装備|スポンサー費|コメント代|外注|罰金)/u.test(text)) {
    score += 1;
  }

  if (/(専門用途|比較基準|構成全体|整理できます)/u.test(text)) {
    score -= 2;
  }

  return score;
}

function getRecentList(key) {
  if (!recentExcusesByKey.has(key)) {
    recentExcusesByKey.set(key, []);
  }

  return recentExcusesByKey.get(key);
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  const cloned = [...list];

  for (let index = cloned.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [cloned[index], cloned[swapIndex]] = [cloned[swapIndex], cloned[index]];
  }

  return cloned;
}

function buildTemplateData(itemName, amount, context) {
  return {
    item: itemName,
    amount,
    formattedAmount: formatCurrency(amount),
    categoryLabel: CATEGORY_LABELS[context.categoryName] || "買い物"
  };
}

function getTemplateSet(context) {
  const subtype = context.itemTraits.subtype;
  return TEMPLATE_MAP[subtype] || TEMPLATE_MAP.genericProduct;
}

function getCategoryCandidates(context, data) {
  const templateSet = getTemplateSet(context);
  const bandTemplates = templateSet[context.priceLevel] || templateSet.normal || [];
  return bandTemplates.map((template) => template(data));
}

function buildCandidateDetails(context) {
  const data = buildTemplateData(context.itemName, context.amount, context);
  const candidates = uniqueCandidates(getCategoryCandidates(context, data));
  const details = [];

  for (const text of candidates) {
    if (!validateGeneratedText(context, text)) {
      continue;
    }

    details.push({
      text,
      score: scoreCandidate(context, text)
    });
  }

  return details;
}

function buildCandidates(context) {
  return buildCandidateDetails(context)
    .filter((detail) => detail.score >= 5)
    .map((detail) => detail.text);
}

function clearFieldErrors() {
  itemError.textContent = "";
  amountError.textContent = "";
}

function clearGenerationError() {
  generationError.classList.add("hidden");
  generationErrorText.textContent = "";
}

function clearResult() {
  resultSection.classList.add("hidden");
  resultText.textContent = "";
  copyStatus.textContent = "";
  lastExcuse = "";
}

function showGenerationError(message) {
  clearResult();
  generationErrorText.textContent = message;
  generationError.classList.remove("hidden");
}

function showResult(text) {
  clearGenerationError();
  resultText.textContent = text;
  resultSection.classList.remove("hidden");
  resultSection.classList.remove("fade-in");
  void resultSection.offsetWidth;
  resultSection.classList.add("fade-in");
}

function validateInputs() {
  clearFieldErrors();

  const rawItemName = itemNameInput.value;
  const displayItemName = cleanDisplayItemName(rawItemName);
  const normalizedItemName = normalizeInput(displayItemName);
  const amountValue = amountInput.value.trim();
  const amount = Number(amountValue);
  let isValid = true;

  if (!displayItemName) {
    itemError.textContent = "商品名を入力してください。";
    isValid = false;
  }

  if (!amountValue) {
    amountError.textContent = "金額を入力してください。";
    isValid = false;
  } else if (!Number.isFinite(amount) || amount <= 0) {
    amountError.textContent = "金額は1円以上で入力してください。";
    isValid = false;
  }

  return {
    isValid,
    displayItemName,
    normalizedItemName,
    amount
  };
}

function buildContext(itemName, normalizedItemName, amount) {
  const specificException = detectSpecificExceptions(normalizedItemName);
  const actionType = detectActionType(normalizedItemName);
  const repairContext = detectRepairContext(normalizedItemName, specificException, actionType);
  const categoryName = detectCategory(normalizedItemName, repairContext, specificException);

  return {
    itemName,
    normalizedItemName,
    amount,
    formattedAmount: formatCurrency(amount),
    categoryName,
    priceLevel: detectPriceLevel(amount, categoryName),
    itemTraits: detectItemTraits(normalizedItemName, categoryName),
    specificException,
    actionType,
    repairContext,
    billingPeriod: detectBillingPeriod(normalizedItemName),
    consumableType: detectConsumableType(normalizedItemName, categoryName)
  };
}

function generateExcuseText(itemName, normalizedItemName, amount) {
  const ambiguousHint = detectAmbiguousInput(normalizedItemName);
  if (ambiguousHint) {
    return {
      ok: false,
      message: ambiguousHint
    };
  }

  const context = buildContext(itemName, normalizedItemName, amount);
  const candidates = buildCandidates(context);

  if (candidates.length === 0) {
    return {
      ok: false,
      message: "言い訳がまとまらなかったので、商品名をもう少し具体的にしてください。"
    };
  }

  const recentKey = `${context.categoryName}:${normalizedItemName}:${amount}`;
  const recentList = getRecentList(recentKey);
  const unusedCandidates = candidates.filter((candidate) => !recentList.includes(candidate));
  const pool = unusedCandidates.length > 0 ? unusedCandidates : candidates;
  const excuse = pickRandom(shuffle(pool));

  recentList.push(excuse);
  if (recentList.length > 16) {
    recentList.shift();
  }

  return {
    ok: true,
    categoryName: context.categoryName,
    categoryLabel: CATEGORY_LABELS[context.categoryName],
    excuse
  };
}

function generateExcuse() {
  clearGenerationError();

  const { isValid, displayItemName, normalizedItemName, amount } = validateInputs();
  if (!isValid) {
    clearResult();
    return;
  }

  const result = generateExcuseText(displayItemName, normalizedItemName, amount);
  if (!result.ok) {
    showGenerationError(result.message);
    return;
  }

  lastExcuse = result.excuse;
  showResult(result.excuse);
}

async function copyExcuse() {
  if (!lastExcuse) {
    return;
  }

  try {
    await navigator.clipboard.writeText(lastExcuse);
    copyStatus.textContent = "コピーしました";
  } catch (error) {
    copyStatus.textContent = "コピーできませんでした";
  }

  if (copyTimerId) {
    window.clearTimeout(copyTimerId);
  }

  copyTimerId = window.setTimeout(() => {
    copyStatus.textContent = "";
  }, 1800);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  generateExcuse();
});

regenerateButton.addEventListener("click", () => {
  generateExcuse();
});

copyButton.addEventListener("click", () => {
  copyExcuse();
});

itemNameInput.addEventListener("input", () => {
  if (itemError.textContent) {
    itemError.textContent = "";
  }

  if (!generationError.classList.contains("hidden")) {
    clearGenerationError();
  }
});

amountInput.addEventListener("input", () => {
  if (amountError.textContent) {
    amountError.textContent = "";
  }
});

window.__shoppingExcuseDebug = {
  APP_VERSION,
  PRICE_THRESHOLDS,
  normalizeInput,
  cleanDisplayItemName,
  detectAmbiguousInput,
  detectSpecificExceptions,
  detectItemType,
  detectCategory,
  detectPriceLevel,
  isSpecificProductName,
  isSpecificServiceName,
  detectItemTraits,
  detectRepairContext,
  detectActionType,
  detectBillingPeriod,
  detectConsumableType,
  getCategoryCandidates,
  buildCandidateDetails,
  buildCandidates,
  buildContext,
  generateExcuseText,
  validateGeneratedText,
  scoreCandidate
};
