const APP_VERSION = "2026.07.16-hybrid-4";

const form = document.getElementById("excuse-form");
const generateButton = document.getElementById("generate-button");
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

let lastExcuse = "";
let copyTimerId = null;
let isGenerating = false;
let currentExcuseState = null;

const WORKER_ENDPOINT = "https://nameless-forest-d144shopping-excuse-tool-worker.innobd11.workers.dev/";
const WORKER_TIMEOUT_MS = 9000;
const AI_CACHE_VERSION = "human-v1";

const sessionExcuseCache = new Map();
const inFlightAiRequests = new Map();

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

const BANNED_AI_PHRASES = [
  "話せます",
  "説明できます",
  "整理できます",
  "筋は通ります",
  "回収先",
  "の顔です",
  "の帯です",
  "一回で納得したい側",
  "時間ごと切っています",
  "比率が高い",
  "まだ自然です",
  "まだ通ります",
  "説明可能",
  "納得しやすいです",
  "意味があります",
  "考えられます"
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
  { subtype: "headphone", category: "device", keywords: ["ヘッドホン"] },
  { subtype: "earphone", category: "device", keywords: ["ワイヤレスイヤホン", "有線イヤホン", "イヤホン"] },
  { subtype: "spacha", category: "creatorSupport", keywords: ["スーパーチャット", "super chat", "スパチャ", "投げ銭", "youtube投げ銭", "配信者支援"] },
  { subtype: "sponsorFrame", category: "creatorSupport", keywords: ["スポンサー枠", "スポンサー費", "協賛"] },
  { subtype: "greenCar", category: "premiumTransit", keywords: ["グリーン車", "新幹線グリーン車", "プレミアムシート", "ファーストクラス", "ビジネスクラス"] },
  { subtype: "medicationApp", category: "subscription", keywords: ["服薬管理アプリ"] },
  { subtype: "bicycleRepair", category: "repair", keywords: ["自転車修理"] },
  { subtype: "wheelchairRepair", category: "repair", keywords: ["車椅子修理"] },
  { subtype: "clockRepair", category: "repair", keywords: ["置き時計修理"] },
  { subtype: "vehiclePurchase", category: "vehiclePurchase", keywords: ["軽自動車", "中古車", "乗用車", "車両購入", "セカンドカー", "自動車"] },
  { subtype: "wheelSet", category: "carCustom", keywords: ["ホイール4本", "タイヤ4本"] },
  { subtype: "carCustom", category: "carCustom", keywords: ["車高調", "マフラー", "ホイール", "スポイラー", "ダウンサス"] },
  { subtype: "carInspection", category: "carMaintenance", keywords: ["車検"] },
  { subtype: "oilChange", category: "carMaintenance", keywords: ["オイル交換"] },
  { subtype: "carMaintenance", category: "carMaintenance", keywords: ["エンジン修理", "タイヤ交換", "ブレーキ", "バッテリー交換", "自動車修理"] },
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
  { subtype: "smartphone", category: "device", keywords: ["iphone", "スマホ", "スマートフォン"] },
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
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、最後まで使い切った時点で廃棄ロス0円です。かなり優秀です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、書くたび少し気分が良くなるので1文字あたりほぼ無料です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、なくさず使い切れば買い直し代0円です。もう得です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、10万文字書けば1文字あたりかなり安いです。文字が勝手に値下がりします。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、手元の機嫌が少し良くなるたびに元を取り返しています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めでも、最後まで削ればムダ0円です。数字の上では優等生です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると文房具ではなく趣味です。科目変更で解決します。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}でも、10万文字書けば1文字あたりかなり安いです。文字が安すぎます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は鉛筆代ではなく、机の上のテンション代です。必要経費に寄せられます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると文房具ではなくコレクションです。予算の科目が違います。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}でも、10万文字書けば1文字0.5円です。文字単価だけ見ると優秀です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は鉛筆の顔をした展示物です。使っても飾ってももう勝ちです。`
    ]
  },
  pen: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、最後までインクが出れば買い直し代0円です。もう得しています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、書けないペンを振る時間が消えます。実質タイムセールです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、使い切った瞬間に元が取れます。文房具はそこが強いです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、書いた文字数で割れば最後はほぼ無料です。数字が全部味方します。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、途中で買い直さないだけで十分黒字です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、毎回ちゃんとインクが出るならそれだけで必要経費です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、最後まで書ければ途中で買い直す必要がありません。先に得しています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}でも、字を書くたび資産を稼働させています。使うほど得です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}はインク代ではなく、書くたび気分を立て直す装置代です。必要経費です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、書いた文字数で割れば最後はほぼ無料です。理屈上は勝ちです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、字を書くたび高い物を使えているので減価償却が進みます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は字を書くためではなく、字を書くたび元を取った気になる道具です。`
    ]
  },
  morning: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、朝を立て直す費用としてはかなり安いです。起きた時点で半分得です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、朝の段取りを一回飛ばせます。時短できたので必要経費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、寝ぼけたまま店まで着けた時点で元は取れています。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、朝ごはんと席をまとめて買ったと思えばそう高くありません。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、朝食というより朝を整えた費用です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、食事代と場所代を一回で済ませたと思えば納得しやすいです。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、食べたい物に最短で着地した代としては悪くありません。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、魚を買って切って洗い物をする手間まで消えています。実質調理代込みです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、自分で魚を揃える手間が丸ごと消えます。かなり手際がいい出費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、満足まで一直線です。寄り道しないので結果的に安いです。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、焼く手間と片付けまで飛ばした分も入っています。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、その日は食事ではなくイベントだったことにします。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、肉代というより今日はこういう日だ代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも普通の夕飯と比べる段階はもう過ぎています。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、家で煙と油を出さずに済みました。清掃代込みなら実質得です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、夕飯ではなくイベントです。科目変更で押し切れます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は食事代より思い出代です。高い分だけネタが残るので一応勝ちです。`
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
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、作る手間ごと省けた時点で十分ありです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、その場で満足まで終わったなら高くついていません。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、乗り換えと遠回りを消した料金だと思えば早いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、荷物と疲れをまとめて運んでもらった感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、歩く気力がない日に時間を買った代としては十分です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、予定を崩さずに済んだ時点で必要経費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、移動代というより体力温存費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でもその分、着いた後にまだ動けます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、歩かなかった歩数で割れば1歩あたりはかなり小さいです。足の節約なので得です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、移動を丸ごとショートカットしています。今日は足を温存できたので勝ちです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、遅刻しないで済めばもう必要経費です。`
    ]
  },
  greenCar: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、少し静かに移動して体力を残す代としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、座る場所を整えて移動の消耗を減らした分です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、移動で消える元気を少し守る代です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、ぜいたくではなく到着後に疲れていない自分の先払いです。必要経費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、座席代ではなく移動後の体力代です。後半が楽なので実質得です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、目的地で元気ならその時点で回収完了です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、目的地で使い物になるなら必要経費寄りです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、移動の快適さより到着後の自分に払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも移動で一日終わるよりは安いです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}はかなり高いです。もう移動というより体力の保全費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、席代より疲れない権利代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、目的地でちゃんと動けるなら元は取りやすいです。`
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
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、荷物と疲れを減らした分としては十分です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、予定を崩さずに済んだ時点で安い方です。`
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
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}は安いですが、タイヤが4本付いていれば1本${formatPerUnit(amount, 4)}です。車体がほぼおまけです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、タクシーを何度も呼ぶ前に移動手段を置いた形です。かなり話が早いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は修理費の確認が先ですが、動けばその瞬間から元を取り返し始めます。`
    ],
    normal: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、4席あれば1席${formatPerUnit(amount, 4)}です。しかも全部移動するので割と優秀です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、通勤と買い物と送迎を一台にまとめています。まとめ買いなので得寄りです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、荷物と時間帯の自由まで付いてきます。移動サブスクを先払いしただけです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、移動手段と趣味を一台にまとめています。2つ買うより実質得です。`,
      ({ item, formattedAmount, amount }) => `${item}に${formattedAmount}でも、1年365日見るなら1日${formatPerDay(amount)}です。意外と毎日で回せます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高額でも、4席で割れば1席ずつは少し落ち着きます。分割すると急に素直です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、移動と趣味を別で買わずに済ませています。まとめたので一応得です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、もう交通費ではなく人生の設備費です。必要経費と言い張れます。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、毎日見る前提なら1日${formatPerDay(amount)}です。毎日使う言い訳は作れます。`
    ]
  },
  carMaintenance: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、エンジン交換より圧倒的に安いです。差額分だけ得しています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、止まってから困る前に払っただけです。予防できたので勝ちです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、車を止めない権利を買った形です。必要経費で押し切れます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、新しい車を買わずに済めば残り全部が節約です。いきなり黒字です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、買い替え話を先送りできた時点でかなり得しています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めでも、車を止めなかっただけで十分仕事をしています。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、新車より安ければ残り全部が節約です。計算上は勝っています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、修理費というより買い替え回避費です。差額がそのまま利益です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は痛いですが、ここで直ればまだ車を買わずに済みます。十分でかいです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、新しい車を買わない差額を考えればまだ節約扱いできます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、修理ではなく延命です。使い切れれば全部回収です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は大きいですが、ここを越えると買い替えより先に直した方が早いです。`
    ]
  },
  carCustom: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、少額で見た目か感触を変えた代としてはありです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、触るたび気付ける変化ならまだ軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、車の触るたび気になる所を減らした代です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、安い物を何度も試すより一回で決めた方が早いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、移動費ではなく趣味代として処理するのが素直です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、車を見るたび回収するタイプの出費です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、気になる状態を長く引きずるより早いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、移動手段より趣味の装備として払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、見るたび満足するなら趣味代として回収できます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は完全に移動費ではありません。車趣味の本体です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、純正で我慢する費用を先払いした感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。合理性より満足を優先した枠です。`
    ]
  },
  wheelSet: {
    low: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも4本なら1本${formatPerUnit(amount, 4)}です。急に普通になりました。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、4つまとめて見た目を変えているので一括割引みたいなものです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、4本全部使えるのでムダがありません。かなり優秀です。`
    ],
    normal: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも4本で割れば1本${formatPerUnit(amount, 4)}です。数字だけ見ると落ち着きます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、見た目を4か所まとめて更新しています。まとめ買いで押し切れます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、駐車場に行くたび元を取る方式です。見る回数だけ得です。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}は高いですが、4本なら1本${formatPerUnit(amount, 4)}です。分けると急に冷静です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、車を一周見るたび4回満足できます。回数で押せます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高額でも、4本まとめて気分が変わるので実質セールです。`
    ],
    extreme: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも4本なら1本${formatPerUnit(amount, 4)}です。高いのに分割すると急に素直です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、走る道具というより眺める趣味の本体です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、4本全部で満足しているので一応まとめ得です。`
    ]
  },
  oilChange: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、エンジン交換より圧倒的に安いです。差額分だけ得しています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、壊れてから慌てるよりずっと安上がりです。必要経費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、先に払って後から困らない方式です。かなり賢いです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高く見えても、エンジン交換より桁が小さいです。比較すると安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、車を止めない権利代です。必要経費で押し切れます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、後で大きく壊さないならその時点で黒字です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、エンジン交換に比べればかなり安いです。差額が利益です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、先に払って大きい修理を避ける保険です。かなり強いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、車が普通に動くならその時点で元は取れています。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は大きいですが、エンジン交換を回避できれば全部安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、整備代より延命費です。まだ車の方が続投です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は痛いですが、大修理より前で止めたなら十分勝ちです。`
    ]
  },
  carInspection: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、公道を走る権利をまとめ買いしただけです。必要経費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、止められないための通行料みたいなものです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、車を置物にしない費用です。かなり大事です。`
    ],
    normal: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、あと2年走れるなら月${formatCurrency(Math.round(amount / 24))}です。実質サブスクです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、公道を走れる権利を延長しています。必要経費でしかありません。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めでも、車を使い続ける前提なら月割りでだいぶ落ち着きます。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、2年で割れば月${formatCurrency(Math.round(amount / 24))}です。月額にすると急に現実的です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、車を公道に残す更新料です。必要経費のど真ん中です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、車を買い直すよりはかなり安いです。比較すると勝ちです。`
    ],
    extreme: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、2年で割れば月${formatCurrency(Math.round(amount / 24))}です。月額にすると少し正気に戻れます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、整備より継続利用の更新料です。払うしかないので必要経費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は大きいですが、車を丸ごと買い替える差額を思えばまだ小さいです。`
    ]
  },
  earphone: {
    low: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、左右で割れば片耳${formatPerUnit(amount, 2)}です。もう半額です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、ケーブルの絡まりを何回か回避した時点で元が取れます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、耳ふたつで使うので最初から2回おいしいです。`
    ],
    normal: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、左右で割れば片耳${formatPerUnit(amount, 2)}です。かなり普通になりました。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、絡まりと付け外しの面倒をまとめて消しています。必要経費です。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、1年毎日使えば1日${formatPerDay(amount)}です。耳の月謝だと思えば安いです。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}は高いですが、左右で割れば片耳${formatPerUnit(amount, 2)}です。半額なので実質得しています。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}でも1年毎日使えば1日${formatPerDay(amount)}です。耳に使うサブスクだと思えば安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、音を買ったのではなく外の音を聞かない権利を買っています。必要経費です。`
    ],
    extreme: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、左右で割れば片耳${formatPerUnit(amount, 2)}です。高額でも半額処理できます。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}でも1年毎日使えば1日${formatPerDay(amount)}です。毎日耳に入るなら十分安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、音より静けさを買っています。意外と必要経費です。`
    ]
  },
  headphone: {
    low: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、左右で割れば片耳${formatPerUnit(amount, 2)}です。もう落ち着きました。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、耳を二つまとめて面倒から守っています。かなり効率的です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回の移動で元を取ったことにできます。強気でも通ります。`
    ],
    normal: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、左右で割れば片耳${formatPerUnit(amount, 2)}です。数字だけ見ると急に親切です。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}でも1年毎日使えば1日${formatPerDay(amount)}です。耳まわりの固定費としては安い方です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、音より周囲を切る壁を買っています。必要経費に寄せられます。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}は高いですが、左右で割れば片耳${formatPerUnit(amount, 2)}です。半額なのでまだ戦えます。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}でも1年毎日使えば1日${formatPerDay(amount)}です。頭に乗せるサブスクだと思えば安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、音を聞くより雑音を断る装置です。必要経費と言い切れます。`
    ],
    extreme: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、左右で割れば片耳${formatPerUnit(amount, 2)}です。高いのに半額処理できます。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}でも1日${formatPerDay(amount)}まで落とせます。毎日使うならもう固定費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、耳を守る壁です。壁代だと思えばまだ安いです。`
    ]
  },
  charger: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、充電できない時間の方が面倒です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、ケーブルを探してイライラするより安いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、不便を一個消した代としては軽いです。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、充電切れで何もできない時間を防げば実質保険です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、買い直しを一回減らしただけでだいぶ勝ちです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、充電待ちのイライラを止めた時点で元が取れています。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、充電切れを何回か止めれば全部必要経費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、充電器代というより詰み防止費です。かなり大事です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、毎日使うならすでに固定費です。`
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
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、配線の面倒を消した分としては普通にありです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一日の小さな雑音を減らす代としては悪くありません。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、毎日耳につけるなら単価はすぐ下がります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、イヤホン代というより騒音を少し消す料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、使うたび配線ストレスが消える分だけ元を削れます。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}は高いですが、左右で割れば片耳${formatPerUnit(amount, 2)}です。半額なので実質得です。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}でも1年毎日使えば1日${formatPerDay(amount)}です。耳のサブスクとしては安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、音を買ったというより外の音を減らす権利を買っています。`
    ],
    extreme: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、左右で割れば片耳${formatPerUnit(amount, 2)}です。高額でも半額処理できます。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}でも1年毎日使えば1日${formatPerDay(amount)}です。毎日耳に入るなら十分安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、音より静けさを買っています。耳の必要経費です。`
    ]
  },
  smartphone: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、電話と地図と財布が一台にまとまるだけで十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、持ち物を何個も減らしているのでわりと得です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、毎日触る前提なので初日から元を削れます。`
    ],
    normal: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、1年毎日使えば1日${formatPerDay(amount)}です。かなり安い固定費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、電話とカメラと地図と財布を一台にまとめています。4台分なので実質得です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、毎日触る回数で割ればだいぶ小さくなります。かなり使い込み前提です。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、1年毎日使えば1日${formatPerDay(amount)}です。毎日使う機械としては安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、電話とカメラと地図と財布を一台にまとめています。4台分なので実質25,000円です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、触る回数を考えるとかなり薄まります。必要経費に寄せられます。`
    ],
    extreme: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、1年毎日使えば1日${formatPerDay(amount)}です。高いのに日割りだと意外と普通です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、電話とカメラと地図と財布を一台に圧縮しています。まとめ買いで押せます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高額でも、毎日持ち歩く前提ならかなり使い倒せます。元は取りやすいです。`
    ]
  },
  laptop: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、不便を一個減らした料金としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、待ち時間にイライラしないだけでも十分です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、機械の機嫌を取る時間を減らした代です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、毎日長く使うなら固定費として薄まります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、安い機械を買い直すより一台で済ませたい出費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、作業待ちを減らした分で十分回収しやすいです。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、毎日3年使えば1日${formatPerDay(amount, 365 * 3)}です。コーヒーより安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、待ち時間にキレないだけでかなり平和です。必要経費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、仕事と趣味を一台にまとめています。台数が減ったので得です。`
    ],
    extreme: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、毎日3年使えば1日${formatPerDay(amount, 365 * 3)}です。毎日ならかなり薄まります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、仕事道具と遊び道具の同居です。二台分だと思えばまだいけます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高額でも、起動するたび元を削っています。かなり前向きです。`
    ]
  },
  smartphoneRepair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、新しい端末を探す手間より軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、使えない時間を短くした分として十分です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、設定し直しを避けただけでもかなり助かります。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、新品を買わなかった差額がそのまま利益です。実質得しています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、設定し直し代が丸ごと0円です。かなり大きいです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、今の環境をそのまま残せます。移行しないだけで得です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、新品探しより早く戻れる時点で十分ありです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、修理費というより今の生活を止めない代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、環境を作り直す手間よりは軽いです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。買い替えと比べて初めて判断する帯です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、修理費より継続費の顔になっています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、今の端末をそのまま使えるなら十分候補です。`
    ]
  },
  bicycleRepair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、新車を見る前に止められる額です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、押して帰る未来を避けた代としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、また普通に乗れる時点でもう仕事はしています。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、買い直す前に止める金額としてはまだましです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、今ある一台をそのまま使い続ける代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、移動手段を止めない費用として十分ありです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、また探し直すより話が早いなら十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、修理費というより買い直し回避費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、乗れる状態に戻るなら買い直しより早いです。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、使えない時間を増やさない費用として十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、買い直すより今の状態を戻す方が早いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、使い慣れた物を止めないための料金です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、必要な物をそのまま使い続ける費用として妥当です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、修理費というより使える状態の維持費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、使えない時間が延びるよりずっとましです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。買い替え比較まで入れて考える帯です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、修理というより継続利用の判断です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、使える状態を保つ費用としては十分です。`
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
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、気に入った景色をそのまま残す代です。`,
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、気に入った物を残せるなら十分ありです。`
    ]
  },
  fashionRepair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、気に入った物をもう少し使う料金として軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、新品探しを一回飛ばした代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、また慣らし直す面倒を避けた代として十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、買い直しより話が早いなら十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、使い慣れた物をもう少し使う代です。`,
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、また探し直す手間まで入れれば残ります。`
    ]
  },
  hat: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、髪型を考えない日が増えるので美容院代を少し回収しています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、顔まわりが一発で決まるのでかなり時短です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、被った時点で今日は完成です。もう元が取れています。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、合わせやすいなら出番で元を取れます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、服装に迷う時間を短くする分で十分です。`,
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
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、冬の外出全部に同行すれば1回あたりは下がるだけです。使うほど得です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、防寒と見た目を一着で済ませています。二役なので得です。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、1年着れば1日${formatPerDay(amount)}です。冬の固定費としては安いです。`
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
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、1年使えば1日${formatPerDay(amount)}です。毎日これで済むならかなり安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、荷物がまとまって服にも合わせやすいです。二役なので得です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、毎回これで済む時点でだいぶ元を取っています。`
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
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、100回お出かけすれば1回あたり${formatPerUnit(amount, 100)}です。けっこう安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、よく履く一足として考えればまだ無茶ではありません。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、左右で割れば片足${formatPerUnit(amount, 2)}です。もう半額です。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}は高いですが、100回履くなら1回あたり${formatCurrency(Math.ceil(amount / 100))}です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、靴代というより出かける気分の装備代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、よく履く一足なら回数で薄まります。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、自分で切って修正に行く未来を消しています。二度手間防止代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、失敗しない時点でかなり得しています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、朝のセットが少しでも楽ならもう必要経費です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、長く悩む時間を一回で止めた感じです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、髪を切ったというより手入れを楽にする費用です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、毎朝の面倒が減るなら十分返ってきます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。美容というよりイベント枠です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、整える以上のことをしに行っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、長く引きずる悩みを止める費用ではあります。`
    ]
  },
  hairOil: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、朝の髪との交渉時間が減れば時給換算で得です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、まとまらない朝を少し短縮できます。かなり実用的です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、使うたび何かしている感が出ます。安心感込みで得です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、毎朝迷わず使えるなら出番で回収できます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、髪の機嫌を少し安定させる代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一本で朝の手数を減らせるだけで十分です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると効果より気分の比率も入っています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、整える油というより朝を急がせる道具です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、毎日触る物なら出番で押せます。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、そのあと痛い痛いと言わずに済めば周囲まで得しています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、体が少し楽になった時点でだいぶ黒字です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、不調を翌日に持ち越さないだけでかなり勝ちです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、楽になって動けるなら結果的に得しやすいです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、体を整えて仕事しやすくする費用です。元は取りやすいです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも不調を引きずる方が面倒です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。ここまで来ると施術代というより不調停止費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、その日のコンディション立て直しに大きく払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、体が楽になって動けるなら十分返ってきます。`
    ]
  },
  gym: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、家から出る理由代としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、一回体を動かした時点で完全敗北ではありません。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、運動のきっかけを買ったと思えば十分です。`
    ],
    normal: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}は1日${formatPerThirtyDays(amount)}です。行った日も行かない日も反省できるので毎日使っています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、運動する理由を月額で買っただけです。必要経費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、家から出た時点で半分元が取れています。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、運動しないまま月を終えるよりはましです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、健康そのものではなく行動の仕組みに払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも外に出る装置としては筋が通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。筋トレ代より、逃げにくくする費用です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、運動より自分の逃げ道封じに払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、行く仕組みを買ったと思えば残ります。`
    ]
  },
  medicationApp: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、飲み忘れを減らす道具としては軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、思い出す手間を外注した感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回でもちゃんと役に立てば十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、管理の面倒を減らす分として十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、薬そのものではなく忘れにくくする料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、毎回確認する手間を減らした時点でありです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、続けやすさを買ったと思えば十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、アプリ代というより管理の手間止め費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも忘れ物を減らす道具としては筋が通ります。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。機能だけでなく安心感にも払っています。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、記録アプリというより管理の本気装備です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、毎日の確認を外せるなら十分ありです。`
    ]
  },
  pcGame: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、数時間遊べれば普通に回収できます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、外に出ずに遊べた日の娯楽費としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回ちゃんと笑えた時点で十分です。`
    ],
    normal: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも70時間遊べば1時間${formatCurrency(Math.round(amount / 70))}です。かなり安い施設です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、外に出ずに遊べるので家計への被害は小さめです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、起動するたび単価が下がります。使うほど得です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、外出イベント一回分と思えばまだ安い方です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、遊ぶための時間を家で確保した費用です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも娯楽費としてはまだ整理しやすいです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。ゲーム代というよりしばらく遊ぶ権利代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、趣味としてかなり本気の帯です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、外遊び何回分かと比べればまだ残ります。`
    ]
  },
  mobileGameCharge: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、遊んだ日の娯楽費としてはまだ軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、見て終わるより一回ちゃんと参加した感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、物は残らなくてもその日の遊び代としては十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は物が残りませんが、外出して飲食するより被害は小さめです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、家で完結した娯楽費です。財布への風通しはまだいいです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、その日ちゃんと遊んだ時点で一応元は取れています。`
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
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、家にいない理由を一つ作れた代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回ちゃんと集中できた時点で回収できます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、席と時間をまとめて買ったと思えば普通です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、その日の予定を一つきれいに埋めた料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、物は残らなくても二時間ちゃんと使えています。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、参加権として見れば十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、物代ではなくその日にそこへ行く権利代です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、同じ機会を後から買い直しにくい分だけ残ります。`,
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、配信参加費としてはまだ軽い方です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、配信を見た料金とコメント代のセットです。単品で払うより得です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、細かく何度も投げる代わりに一回で置いたので手数料みたいな気分が減ります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、見るだけで終わらなかったので参加費込みです。必要経費です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、もうコメントではなくスポンサー枠です。カテゴリー変更で押し切れます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、応援予算の本体です。雑費ではなく支援費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、コメント代ではなく支援費です。科目変更で勝てます。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、もうコメントではなくスポンサー枠です。問題は科目です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、配信参加費ではなく応援費です。分類で押し切れます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、支援費として分けた瞬間に雑費ではなくなります。かなり大きいです。`
    ]
  },
  sponsorFrame: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、応援を見える形にした費用としてはまだ軽いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、物代ではなく名前を出した支援費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、娯楽費より支援費に近い出費です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、商品代ではなくスポンサー費として見る方がしっくりきます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、応援予算を一回で置いた支出です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、物が残らない代わりに支援の記録はちゃんと残ります。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、もう娯楽費よりスポンサー費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、名前を出して応援した記録代として見るのが素直です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも支援先がはっきりしている分だけ散財より話は早いです。`
    ],
    extreme: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、応援と広告と記録をまとめ買いしています。3つ分なので1つ${formatCurrency(Math.round(amount / 3))}です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、もう商品代ではなくスポンサー費です。科目変更で処理します。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、応援費として切り分けた時点で雑費ではありません。必要経費です。`
    ]
  },
  chair: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、床に座るより楽な時点で十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、座る場所をちゃんと確保した代として軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回姿勢がましになるだけでも十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、毎日座るなら家の中でかなり出番があります。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、家具代というより作業姿勢代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、数時間座る物として見るとそこまで変ではありません。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも1年毎日座れば1日${formatPerDay(amount)}です。座り放題なので実質得です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、毎日尻の下にいるので出番だけは絶対あります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、座るたび使えるのでかなり減価償却が早いです。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、毎朝の小さい機嫌代としては十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、毎日目に入る物なら出番で押せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、飲み物代ではなく見る物への課金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、使うたびちょっと気分が上がるなら十分です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、飲み物を入れるたび使えます。中身を替えれば毎回別商品です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、机の景色まで込みで買っています。使うたび元が減ります。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、毎日何回でも起動できます。かなり回転率がいいです。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、一度ずぶ濡れを防げば服と靴の被害額を回収できます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、びしょびしょ回避費としてかなり優秀です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回の雨で元を取りにいけます。かなり強いです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると雨具より気分の装備です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、濡れない以上に持ちたい気持ちにも払っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、雨の日の不機嫌を減らせるなら十分です。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、休日を掃除で使わずに済みました。休日を買えたので安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、掃除ではなく自分が動き出すまでの長い時間を消しています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、苦手作業を先に外した時点でかなり勝ちです。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、家事ではなく休みを買ったと思えば整理しやすいです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、疲れている日に生活を崩さないための費用です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気です。でも休日を作業で潰すよりは話が早いです。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。家事代より生活立て直し費の顔です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、作業ではなく自由時間を取り戻しに行っています。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、崩れた生活を戻す用途なら残ります。`
    ]
  },
  subscriptionGeneric: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回使った時点でそこまで赤字ではありません。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、都度払う手間を消した代としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、解約を忘れなければ十分回せます。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、毎回払う面倒を省けるだけでも十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、月の中で何回か使えば元は取りやすいです。`,
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
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、席と空気まで込みで考えれば十分です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、昼食を少しイベント化した料金です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高めですが、食事と場所代をまとめた感じです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、宿泊ではなく昼の気分転換代です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、ホテルを使った昼食として見ればまだ残ります。`
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
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、家の中の面倒を少し減らす料金として十分です。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、毎日触るなら出番で押せます。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、買い直しを減らす方に振った感じです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は、使うたび地味に楽になるなら十分です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると便利さと気分の合算です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、実用品の顔をした趣味寄りの出費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、毎日見る物なら出番で返ってきます。`
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
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、1年使えば1日${formatPerDay(amount)}です。日割りするとかなり安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、一回使った時点で初期投資回収開始です。かなり前向きです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、買い直しを一回防いだだけでもう半分勝っています。`
    ],
    high: [
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、1年使えば1日${formatPerDay(amount)}です。ほぼ固定費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}は高いですが、ここまで来ると実用品ではなく趣味です。科目変更でいけます。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回でもちゃんと使えば言い訳は成立です。もう元取り開始です。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、ここまで来ると実用品ではなく趣味です。予算の科目が違います。`,
      ({ item, formattedAmount, amount }) => `${formattedAmount}の${item}でも、1年使えば1日${formatPerDay(amount)}です。日割りで押せばまだ安いです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、買い物ではなく記念です。記念品ならむしろ安いです。`
    ]
  },
  genericService: {
    low: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回面倒が減れば十分です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、手間を少し外注した料金としては軽いです。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、時間を買ったと言ってそこまで無理はありません。`
    ],
    normal: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、自分でやるより早く終われば十分です。時短できたので得です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、作業そのものより先延ばし時間を消した料金です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}なら、一回面倒が消えた時点でかなり優秀です。`
    ],
    high: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いですが、自分でやる気が出ない時間ごと消えています。かなり大きいです。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}なら、気力温存費として十分成立します。必要経費です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}でも、面倒を丸ごと外した時点でだいぶ得しています。`
    ],
    extreme: [
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は高いです。もう作業代より生活立て直し費です。`,
      ({ item, formattedAmount }) => `${item}に${formattedAmount}まで行くと、時間の買い方としてかなり本気です。`,
      ({ item, formattedAmount }) => `${formattedAmount}の${item}は強気ですが、面倒を丸ごと外せるなら十分残ります。`
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
    .replace(/[ 　]+(?:代|料金)$/u, "")
    .trim();
}

function formatCurrency(amount) {
  return `${Number(amount).toLocaleString("ja-JP")}円`;
}

function formatPerUnit(amount, units) {
  return formatCurrency(Math.round(amount / units));
}

function formatPerDay(amount, days = 365) {
  return formatCurrency(Math.round(amount / days));
}

function formatPerThirtyDays(amount) {
  return formatCurrency(Math.round(amount / 30));
}

function detectAmbiguousInput(normalizedItemName) {
  if (!normalizedItemName) {
    return "商品名を入力してください。";
  }

  const plain = normalizedItemName.replace(/[0-9.,円万円千円]/g, "").trim();
  const strictGenericWords = new Map([
    ["オイル", "商品名をもう少し具体的に入力してください。"],
    ["チケット", "商品名をもう少し具体的に入力してください。"],
    ["メンバーシップ", "商品名をもう少し具体的に入力してください。"]
  ]);

  for (const [word, message] of GENERIC_NAME_MESSAGES.entries()) {
    if (plain === word) {
      return message;
    }
  }

  for (const [word, message] of strictGenericWords.entries()) {
    if (plain === word.toLowerCase()) {
      return message;
    }
  }

  if (/^(商品|用品|部品|サービス|グッズ|アイテム)(の.*)?$/u.test(plain)) {
    return "商品名をもう少し具体的に入力してください。";
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

  if (/(猫|犬|ペット)/u.test(normalizedItemName)) {
    return "living";
  }

  if (/(代行|クリーニング|施術|相談|診断|レッスン|サロン)/u.test(normalizedItemName)) {
    return "genericService";
  }

  if (/(ガチャ|フィギュア|観葉植物|ソファ|エアコン|空気清浄機|歯ブラシ|トレッキング|リュック)/u.test(normalizedItemName)) {
    return "genericProduct";
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

function detectItemTraits(normalizedItemName, categoryName) {
  const matchedSubtype = detectItemType(normalizedItemName);
  const resolvedSubtype = matchedSubtype || CATEGORY_FALLBACKS[categoryName] || "genericProduct";

  return {
    matchedSubtype,
    resolvedSubtype,
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

  if (BANNED_AI_PHRASES.some((phrase) => normalized.includes(phrase))) {
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

  if (/(専門用途|比較基準|構成全体|整理できます|自然です|話せます|説明できます|筋は通ります)/u.test(text)) {
    score -= 2;
  }

  return score;
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
  const subtype = context.itemTraits.resolvedSubtype;
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

function buildLocalCandidates(context) {
  return buildCandidateDetails(context)
    .filter((detail) => detail.score >= 5)
    .map((detail) => detail.text);
}

function inferFallbackTheme(context) {
  const name = context.normalizedItemName;

  if (/(エアコン|クーラー|暖房|冷房|空気清浄機|除湿機)/u.test(name)) {
    return "climate";
  }

  if (/(椅子|デスク|机|モニター|キーボード|マウス|pc|パソコン|スマホ)/u.test(name)) {
    return "work";
  }

  if (/(ベッド|布団|枕|ソファ|家具|家電)/u.test(name)) {
    return "home";
  }

  if (/(旅行|ホテル|旅館|チケット|ライブ|映画)/u.test(name)) {
    return "experience";
  }

  if (/(スパチャ|投げ銭|スポンサー|支援)/u.test(name)) {
    return "support";
  }

  return "general";
}

function buildWorkerFallbackCandidates(context) {
  const perDay = formatPerDay(context.amount, 365);
  const perUse = formatPerUnit(context.amount, 100);
  const theme = inferFallbackTheme(context);

  const templatesByTheme = {
    climate: [
      `${context.itemName}に${context.formattedAmount}円は大きく見えても、暑さや寒さを毎日受け続ける方が地味にきついです。1年間使う前提なら1日あたり${perDay}円なので、部屋の快適さを買う話としては通せます。`,
      `${context.formattedAmount}円の${context.itemName}は勢いに見えても、家でしんどい時間を減らせるなら話は別です。使う日が続くものなら、我慢代を先に払わなくて済む分だけまだ納得しやすいです。`,
      `${context.itemName}は高く見えても、毎日使うなら一回ごとの不快を少しずつ減らす道具です。100回使うと仮定すれば1回あたり${perUse}円なので、完全に無茶な出費とまでは言いにくいです。`
    ],
    work: [
      `${context.itemName}に${context.formattedAmount}円は軽くないですが、使うたびに手間や疲れが減るなら回収しやすい出費です。100回使うと仮定すれば1回あたり${perUse}円なので、仕事道具としてはまだ説明がつきます。`,
      `${context.formattedAmount}円の${context.itemName}は安くはなくても、毎回の作業で引っかかる時間を減らせるなら十分元を取りにいけます。使う回数が多い前提なら、気分転換より効率の話にできます。`,
      `${context.itemName}は一度に払う額だけ見ると強いですが、作業のしんどさをまとめて下げるなら必要経費寄りです。1年間使う前提なら1日あたり${perDay}円なので、無理筋ではありません。`
    ],
    home: [
      `${context.itemName}に${context.formattedAmount}円は大きく見えても、家で毎日触るものなら満足度がそのまま積み上がります。1年間使う前提なら1日あたり${perDay}円なので、生活を少し楽にする費用としては通ります。`,
      `${context.formattedAmount}円の${context.itemName}は安くはないですが、使うたびに地味なストレスを減らせるなら悪くない出費です。毎日使うものを後回しにする方が、あとでじわじわ効いてきます。`,
      `${context.itemName}はぜいたく品っぽく見えても、家の快適さを上げるものは出番が多いです。100回使うと仮定すれば1回あたり${perUse}円なので、雑に散財した話とは少し違います。`
    ],
    experience: [
      `${context.itemName}に${context.formattedAmount}円は安くないですが、ただの物よりその日で終わる満足に払ったと考えると筋は通ります。中途半端に何回も使うより、一回でちゃんと使った方がまだ話が早いです。`,
      `${context.formattedAmount}円の${context.itemName}は一瞬で消える出費に見えても、目的がはっきりしているぶんなんでもない浪費より説明しやすいです。予定として使い切るなら、少なくとも雑な出費ではありません。`,
      `${context.itemName}は高く見えても、その場の体験や移動をまとめて買うものです。後から細かく散らすより一回で使い道が決まっているなら、まだ納得の形にしやすいです。`
    ],
    support: [
      `${context.itemName}に${context.formattedAmount}円は軽くないですが、物ではなく応援に使うと最初から決めていたなら整理はできます。少額を何度も重ねるより、一回で予算を切ったと考えればまだ説明はつきます。`,
      `${context.formattedAmount}円の${context.itemName}は残る物がないぶん強く見えても、用途がはっきり応援費なら雑な買い物とは別です。予算の中でここに回したなら、ただの衝動とまでは言い切れません。`,
      `${context.itemName}は高く見えても、最初から娯楽費ではなく支援費として切っているなら話は変わります。使い道がぶれていない分、散らした出費よりは説明しやすいです。`
    ],
    general: [
      `${context.itemName}に${context.formattedAmount}円は安くないですが、使い道があるならそれだけで雑な出費とは違います。100回使うと仮定すれば1回あたり${perUse}円なので、回数が出るものなら十分説明できます。`,
      `${context.formattedAmount}円の${context.itemName}は一度に見ると重くても、1年間使う前提なら1日あたり${perDay}円です。出番があるなら、その金額で毎回の小さな不満を減らす話として通せます。`,
      `${context.itemName}は高く見えても、ちゃんと使う前提なら単価はだんだん下がります。必要になるたびに別の手段でごまかすより、一回で整えた方が結果的にラクなこともあります。`
    ]
  };

  return templatesByTheme[theme] || templatesByTheme.general;
}

function clearFieldErrors() {
  itemError.textContent = "";
  amountError.textContent = "";
}

function clearGenerationError() {
  generationError.classList.add("hidden");
  generationErrorText.textContent = "";
}

function clearGenerationStatus() {
  generationStatus.textContent = "";
  generationStatus.classList.add("hidden");
}

function clearResult() {
  resultSection.classList.add("hidden");
  resultText.textContent = "";
  resultMeta.textContent = "";
  resultMeta.classList.add("hidden");
  copyStatus.textContent = "";
  lastExcuse = "";
  currentExcuseState = null;
}

function showGenerationError(message) {
  clearResult();
  clearGenerationStatus();
  generationErrorText.textContent = message;
  generationError.classList.remove("hidden");
}

function showGenerationStatus(message) {
  generationStatus.textContent = message;
  generationStatus.classList.remove("hidden");
}

function showResult(text, metaText = "") {
  clearGenerationError();
  clearGenerationStatus();
  resultText.textContent = text;

  if (metaText) {
    resultMeta.textContent = metaText;
    resultMeta.classList.remove("hidden");
  } else {
    resultMeta.textContent = "";
    resultMeta.classList.add("hidden");
  }

  resultSection.classList.remove("hidden");
  resultSection.classList.remove("fade-in");
  void resultSection.offsetWidth;
  resultSection.classList.add("fade-in");
}

function setBusyState(nextBusy, message = "") {
  isGenerating = nextBusy;
  generateButton.disabled = nextBusy;
  regenerateButton.disabled = nextBusy;
  itemNameInput.disabled = nextBusy;
  amountInput.disabled = nextBusy;

  if (nextBusy) {
    showGenerationStatus(message || "この商品に合う言い訳を考えています……");
  } else {
    clearGenerationStatus();
  }
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
  const itemTraits = detectItemTraits(normalizedItemName, categoryName);
  const priceLevel = detectPriceLevel(amount, categoryName);
  const localTemplateAvailable =
    Boolean(itemTraits.matchedSubtype) &&
    !["genericProduct", "genericService"].includes(itemTraits.matchedSubtype);

  return {
    itemName,
    normalizedItemName,
    amount,
    formattedAmount: formatCurrency(amount),
    categoryName,
    priceLevel,
    itemTraits,
    localTemplateAvailable,
    specificException,
    actionType,
    repairContext,
    billingPeriod: detectBillingPeriod(normalizedItemName),
    consumableType: detectConsumableType(normalizedItemName, categoryName)
  };
}

function buildLocalSessionKey(context) {
  return `local:${context.normalizedItemName}:${context.amount}`;
}

function buildAiSessionKey(context) {
  return `ai:${AI_CACHE_VERSION}:${context.normalizedItemName}:${context.amount}`;
}

function buildExcuseState(sessionKey, candidates, metaText, sourceType) {
  return {
    sessionKey,
    candidates: shuffle(candidates),
    index: 0,
    metaText,
    sourceType
  };
}

function getNextExcuseFromState(state) {
  if (!state || state.candidates.length === 0) {
    return "";
  }

  if (state.index >= state.candidates.length) {
    state.candidates = shuffle(state.candidates);
    state.index = 0;
  }

  const nextText = state.candidates[state.index];
  state.index += 1;
  return nextText;
}

function materializeTemplate(template, itemName, amount) {
  return template
    .replace(/\{item\}/g, itemName)
    .replace(/\{amount\}/g, formatCurrency(amount));
}

function validateWorkerTemplateTemplate(template) {
  if (typeof template !== "string") {
    return false;
  }

  if (template.length === 0 || template.length > 120) {
    return false;
  }

  if (countSentences(template) < 1 || countSentences(template) > 2) {
    return false;
  }

  if (!template.includes("{item}") && !template.includes("{amount}")) {
    return false;
  }

  if (/<[^>]+>/u.test(template)) {
    return false;
  }

  if (/https?:\/\//iu.test(template)) {
    return false;
  }

  if (/```|function\s*\(|<script|javascript:/iu.test(template)) {
    return false;
  }

  if (BANNED_EMPTY_JUSTIFICATIONS.some((phrase) => template.includes(phrase))) {
    return false;
  }

  if (BANNED_AI_PHRASES.some((phrase) => template.includes(phrase))) {
    return false;
  }

  return true;
}

function normalizeWorkerTemplates(templates, itemName, amount) {
  if (!Array.isArray(templates)) {
    return [];
  }

  return uniqueCandidates(
    templates
      .filter((template) => validateWorkerTemplateTemplate(template))
      .map((template) => materializeTemplate(template, itemName, amount))
  );
}

function getAiMetaText() {
  return "";
}

function mapWorkerErrorToMessage(code) {
  switch (code) {
    case "input_invalid":
    case "item_too_generic":
      return "商品名をもう少し具体的に入力してください。";
    case "unknown_item":
      return "この商品に合う自然な言い訳を作れませんでした。商品名をもう少し具体的にしてください。";
    case "rate_limited":
    case "free_limit":
    case "generation_locked":
      return "現在、言い訳の自動生成が混み合っています。時間を空けて再度お試しください。";
    case "network_error":
    case "worker_unreachable":
      return "言い訳の取得に失敗しました。通信状態を確認して再度お試しください。";
    case "server_error":
    case "gemini_unavailable":
    case "cache_unavailable":
    case "invalid_ai_response":
    default:
      return "現在この商品用の言い訳を作れません。少し時間を空けて再度お試しください。";
  }
}

function isWorkerConfigured() {
  return /^https:\/\/.+/u.test(WORKER_ENDPOINT) && !WORKER_ENDPOINT.includes("REPLACE_WITH_YOUR_WORKER_URL");
}

async function fetchAiTemplates(context) {
  const sessionKey = buildAiSessionKey(context);
  const cachedState = sessionExcuseCache.get(sessionKey);
  if (cachedState) {
    return cachedState;
  }

  if (inFlightAiRequests.has(sessionKey)) {
    return inFlightAiRequests.get(sessionKey);
  }

  const pendingPromise = (async () => {
    if (!isWorkerConfigured()) {
      throw new Error("server_error");
    }

    const controller = new AbortController();
    const timerId = window.setTimeout(() => controller.abort(), WORKER_TIMEOUT_MS);

    try {
      const response = await fetch(WORKER_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          item: context.itemName,
          amount: context.amount,
          normalizedItem: context.normalizedItemName,
          priceLevel: context.priceLevel,
          language: "ja"
        }),
        signal: controller.signal
      });

      let payload = null;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error("invalid_ai_response");
      }

      if (!response.ok || payload?.status === "error") {
        throw new Error(payload?.code || "server_error");
      }

      if (payload?.status !== "success") {
        throw new Error("unknown_item");
      }

      const normalizedCandidates = normalizeWorkerTemplates(payload.templates, context.itemName, context.amount);
      if (normalizedCandidates.length === 0) {
        throw new Error("unknown_item");
      }

      const nextState = buildExcuseState(
        sessionKey,
        normalizedCandidates,
        "",
        "ai"
      );

      sessionExcuseCache.set(sessionKey, nextState);
      return nextState;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("network_error");
      }

      throw error;
    } finally {
      window.clearTimeout(timerId);
      inFlightAiRequests.delete(sessionKey);
    }
  })();

  inFlightAiRequests.set(sessionKey, pendingPromise);
  return pendingPromise;
}

function getExistingStateForCurrentInput(context) {
  const localKey = buildLocalSessionKey(context);
  const aiKey = buildAiSessionKey(context);

  if (currentExcuseState?.sessionKey === localKey || currentExcuseState?.sessionKey === aiKey) {
    return currentExcuseState;
  }

  if (sessionExcuseCache.has(localKey)) {
    return sessionExcuseCache.get(localKey);
  }

  if (sessionExcuseCache.has(aiKey)) {
    return sessionExcuseCache.get(aiKey);
  }

  return null;
}

async function generateExcuse() {
  if (isGenerating) {
    return;
  }

  clearGenerationError();

  const { isValid, displayItemName, normalizedItemName, amount } = validateInputs();
  if (!isValid) {
    clearResult();
    return;
  }

  const ambiguousHint = detectAmbiguousInput(normalizedItemName);
  if (ambiguousHint) {
    showGenerationError("商品名をもう少し具体的に入力してください。");
    return;
  }

  const context = buildContext(displayItemName, normalizedItemName, amount);
  const existingState = getExistingStateForCurrentInput(context);

  if (existingState) {
    currentExcuseState = existingState;
    const nextText = getNextExcuseFromState(existingState);
    lastExcuse = nextText;
    showResult(nextText, existingState.metaText);
    return;
  }

  if (context.localTemplateAvailable) {
    const localCandidates = buildLocalCandidates(context);

    if (localCandidates.length === 0) {
      showGenerationError("この商品に合う自然な言い訳を作れませんでした。商品名をもう少し具体的にしてください。");
      return;
    }

    const state = buildExcuseState(
      buildLocalSessionKey(context),
      localCandidates,
      "",
      "local"
    );

    sessionExcuseCache.set(state.sessionKey, state);
    currentExcuseState = state;

    const nextText = getNextExcuseFromState(state);
    lastExcuse = nextText;
    showResult(nextText, "");
    return;
  }

  setBusyState(true, "この商品に合う言い訳を考えています……");

  try {
    const aiState = await fetchAiTemplates(context);
    currentExcuseState = aiState;
    const nextText = getNextExcuseFromState(aiState);
    lastExcuse = nextText;
    showResult(nextText, aiState.metaText);
  } catch (error) {
    const fallbackCandidates = buildWorkerFallbackCandidates(context).filter((text) =>
      validateGeneratedText(context, text)
    );

    if (fallbackCandidates.length > 0) {
      const fallbackState = buildExcuseState(
        buildAiSessionKey(context),
        fallbackCandidates,
        "",
        "fallback"
      );

      sessionExcuseCache.set(fallbackState.sessionKey, fallbackState);
      currentExcuseState = fallbackState;
      const nextText = getNextExcuseFromState(fallbackState);
      lastExcuse = nextText;
      showResult(nextText, "");
      return;
    }

    showGenerationError(mapWorkerErrorToMessage(error.message));
  } finally {
    setBusyState(false);
  }
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
  AI_CACHE_VERSION,
  WORKER_ENDPOINT,
  PRICE_THRESHOLDS,
  normalizeInput,
  cleanDisplayItemName,
  detectAmbiguousInput,
  detectSpecificExceptions,
  detectItemType,
  detectCategory,
  detectPriceLevel,
  detectItemTraits,
  detectRepairContext,
  detectActionType,
  detectBillingPeriod,
  detectConsumableType,
  getCategoryCandidates,
  buildCandidateDetails,
  buildLocalCandidates,
  buildContext,
  validateGeneratedText,
  scoreCandidate,
  normalizeWorkerTemplates,
  materializeTemplate
};
