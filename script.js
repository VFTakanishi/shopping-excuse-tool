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

let lastExcuse = "";
let copyTimerId = null;
const APP_VERSION = "2026.07.15-logic-3";

console.info(`Shopping Excuse Tool ${APP_VERSION}`);

const recentExcusesByKey = new Map();

const CATEGORY_LABELS = {
  carMaintenance: "車・バイク整備",
  carCustom: "車・バイクカスタム",
  vehiclePurchase: "自動車購入",
  transport: "移動",
  premiumTransit: "快適な移動",
  travelStay: "旅行・宿泊",
  food: "食事",
  shoes: "靴",
  fashionWear: "服",
  bag: "バッグ",
  fashionAccessory: "小物",
  beautyProduct: "美容用品",
  beautyService: "美容サービス",
  healthDevice: "健康用品",
  healthApp: "健康アプリ",
  healthService: "身体メンテナンス",
  healthSubscription: "継続的な健康支出",
  gameMicrotransaction: "ゲーム課金",
  medicalCare: "医療",
  insurance: "保険",
  homeDevice: "家電・デバイス",
  homeRepair: "家電・デバイス修理",
  workTool: "仕事道具",
  gameEntertainment: "娯楽",
  event: "イベント・体験",
  dailyGoods: "日用品",
  timeSavingService: "時短サービス",
  sponsorship: "スポンサー・応援",
  creatorSupport: "配信者支援",
  gift: "プレゼント",
  subscription: "サブスク",
  fashionRepair: "服飾品の修理",
  genericRepair: "修理",
  interior: "インテリア",
  otherProduct: "商品",
  otherService: "サービス"
};

const AMBIGUOUS_INPUTS = {
  オイル: "「エンジンオイル」や「ヘアオイル」のように、用途が分かる名前で入力してください。",
  チケット: "「ライブチケット」や「映画チケット」のように、内容が分かる名前で入力してください。",
  バッグ: "",
  サービス: "「家事代行サービス」のように、何を任せたか分かる名前で入力してください。"
};

const BANNED_EMPTY_JUSTIFICATIONS = [
  "理屈を盛りすぎなくても",
  "納得して選んだなら",
  "それを欲しいと思った",
  "自分の判断を優先した",
  "生活に支障が出ない範囲なら",
  "完璧な理屈は要りません",
  "自分で納得しているなら",
  "それで十分です",
  "応援にお金を使った形です"
];

const WORDS = {
  repair: ["修理", "交換修理", "オーバーホール", "補修", "メンテナンス", "整備", "修繕", "調整"],
  repairLikeExchange: [
    "エンジンオイル交換",
    "オイル交換",
    "タイヤ交換",
    "バッテリー交換",
    "ブレーキパッド交換",
    "画面交換",
    "液晶交換",
    "部品交換",
    "ホース交換",
    "ベルト交換",
    "フィルター交換",
    "ブレーキ交換"
  ],
  excludedVehicle: ["自転車", "電車", "台車", "車椅子", "ベビーカー", "自動車学校", "駐車場", "洗車", "列車"],
  vehicle: [
    "自動車",
    "中古車",
    "軽自動車",
    "乗用車",
    "車両購入",
    "中古の自動車",
    "中古の車",
    "セカンドカー",
    "車検",
    "車高調",
    "マフラー",
    "エンジン",
    "タイヤ",
    "ブレーキ",
    "サスペンション",
    "ホイール",
    "バイク",
    "オートバイ",
    "クラッチ",
    "オイル",
    "ラジエーター"
  ],
  carCustom: ["車高調", "マフラー", "ホイール", "エアロ", "スポイラー", "サスペンション", "ダウンサス"],
  vehiclePurchase: ["自動車", "中古車", "軽自動車", "乗用車", "車両購入", "中古の自動車", "中古の車", "セカンドカー"],
  vehicleMaintenance: ["車検", "エンジンオイル", "ブレーキ", "タイヤ交換", "オイル交換", "オーバーホール", "整備"],
  homeDevice: [
    "airpods",
    "iphone",
    "ipad",
    "macbook",
    "pc",
    "ノートpc",
    "パソコン",
    "スマホ",
    "スマートフォン",
    "ドライヤー",
    "イヤホン",
    "ヘッドホン",
    "モニター",
    "タブレット",
    "洗濯機",
    "冷蔵庫",
    "電子レンジ",
    "掃除機",
    "炊飯器"
  ],
  fashionRepair: ["靴修理", "バッグ修理", "時計修理", "服修理", "鞄修理", "スニーカー修理", "腕時計修理"],
  serviceWords: ["サービス", "代行", "施術", "診断", "診察", "サロン", "枠"],
  recurringWords: ["月額", "月会費", "月謝", "サブスク", "メンバーシップ", "会費", "定期", "オンラインサロン"],
  annualWords: ["年会費", "年間", "年額", "1年"],
  premiumTransit: ["グリーン車", "プレミアムシート", "ファーストクラス", "ビジネスクラス"],
  transport: ["タクシー", "駐車場代", "駐車料金", "ガソリン", "新幹線", "電車代", "バス代", "移動"],
  travelStay: ["ホテル", "旅館", "宿泊", "温泉旅行", "旅行", "ツアー"],
  hotelFood: ["ホテルランチ", "ホテルモーニング", "ホテルディナー", "ホテルのモーニング", "旅館の朝食"],
  event: ["ライブチケット", "映画チケット", "映画", "美術館", "イベント", "フェス", "展示会", "舞台", "コンサート"],
  food: [
    "海鮮丼",
    "焼肉",
    "寿司",
    "ランチ",
    "ディナー",
    "モーニング",
    "弁当",
    "海鮮",
    "ごはん",
    "食事",
    "ラーメン",
    "コース",
    "海鮮丼"
  ],
  dailyGoods: ["シャンプー", "ボディソープ", "洗剤", "歯ブラシ", "ティッシュ", "コンビニ弁当", "日用品"],
  timeSavingService: ["家事代行", "掃除代行", "時短サービス", "代行サービス", "宅配クリーニング"],
  beautyProduct: ["ヘアオイル", "化粧品", "コスメ", "美容液", "スキンケア", "薬用シャンプー", "ヘアミルク"],
  beautyService: ["美容院", "散髪", "ヘアサロン", "カラー", "ネイル", "まつげ", "眉毛"],
  healthDevice: ["体重計", "マッサージチェア", "トレーニング器具", "ストレッチポール", "ヨガマット", "健康器具"],
  healthApp: ["服薬管理アプリ", "ヘルスケアアプリ", "健康アプリ", "歩数計アプリ", "お薬手帳アプリ"],
  healthService: ["整体", "もみほぐし", "マッサージ", "健康診断", "鍼灸"],
  healthSubscription: ["ジム月会費", "ジム", "オンラインフィットネス", "パーソナルジム"],
  excludedMedical: ["薬用シャンプー", "薬用石鹸", "漢方茶"],
  medicalCare: ["薬代", "風邪薬", "病院", "診察", "通院", "検査", "処方薬", "歯医者", "目薬"],
  insurance: ["保険", "自動車保険", "医療保険", "生命保険", "火災保険"],
  gameEntertainment: ["pcゲーム", "switchソフト", "ps5ゲーム", "ゲームソフト", "steam", "xbox", "漫画", "フィギュア"],
  gameMicrotransaction: ["スマホゲーム課金", "ゲーム課金", "ガチャ課金", "課金", "シーズンパス", "バトルパス"],
  sponsorship: ["スポンサー枠", "スポンサー", "協賛", "支援", "fanbox", "patreon"],
  creatorSupport: ["スパチャ", "スーパーチャット", "super chat", "投げ銭", "配信への投げ銭", "youtube投げ銭", "配信者支援"],
  workTool: ["snap-on", "ラチェット", "工具", "ノートpc", "仕事用", "業務用", "airpods pro", "airpods", "ドライヤー業務用"],
  shoes: ["スニーカー", "靴", "ブーツ", "ローファー", "パンプス", "サンダル"],
  bag: ["バッグ", "鞄", "カバン", "リュック", "トート"],
  fashionAccessory: ["腕時計", "帽子", "リング", "ネックレス", "ピアス", "アクセサリー"],
  fashionWear: ["コート", "シャツ", "デニム", "パンツ", "ジャケット", "服", "ニット", "アウター"],
  gift: ["プレゼント", "ギフト", "贈り物"],
  subscription: ["netflix", "spotify", "youtube premium", "amazon prime", "オンラインサロン", "オンラインサロン月額", "サブスク"],
  interior: ["置物", "オブジェ", "ポスター", "花瓶", "アート", "絵", "インテリア"]
};

const CATEGORY_META = {
  carMaintenance: { suggestion: "「車検」「ブレーキ修理」のように内容が分かる名前で入力してください。" },
  carCustom: { suggestion: "「車高調」「マフラー」のように部品名が分かる名前で入力してください。" },
  vehiclePurchase: { suggestion: "「自動車」「中古車」のように車両購入だと分かる名前で入力してください。" },
  transport: { suggestion: "「タクシー」「駐車場代」のように移動内容が分かる名前で入力してください。" },
  premiumTransit: { suggestion: "「新幹線グリーン車」のように移動内容が分かる名前で入力してください。" },
  travelStay: { suggestion: "「ホテル宿泊」「旅館」のように内容が分かる名前で入力してください。" },
  food: { suggestion: "「海鮮丼」「ホテルランチ」のように食事内容が分かる名前で入力してください。" },
  shoes: { suggestion: "「スニーカー」のように靴の種類が分かる名前で入力してください。" },
  fashionWear: { suggestion: "「コート」「デニム」のように服の種類が分かる名前で入力してください。" },
  bag: { suggestion: "「バッグ」「リュック」のように種類が分かる名前で入力してください。" },
  fashionAccessory: { suggestion: "「腕時計」「帽子」のように品名が分かる名前で入力してください。" },
  beautyProduct: { suggestion: "「ヘアオイル」のように美容用品名が分かる名前で入力してください。" },
  beautyService: { suggestion: "「美容院」のようにサービス内容が分かる名前で入力してください。" },
  healthDevice: { suggestion: "「体重計」のように健康用品名が分かる名前で入力してください。" },
  healthApp: { suggestion: "「服薬管理アプリ」のようにアプリ名が分かる名前で入力してください。" },
  healthService: { suggestion: "「整体」のように内容が分かる名前で入力してください。" },
  healthSubscription: { suggestion: "「ジム月会費」のように継続サービス名が分かる名前で入力してください。" },
  gameMicrotransaction: { suggestion: "「スマホゲーム課金」のように課金内容が分かる名前で入力してください。" },
  medicalCare: { suggestion: "「薬代」「病院」のように医療内容が分かる名前で入力してください。" },
  insurance: { suggestion: "「医療保険」のように保険の種類が分かる名前で入力してください。" },
  homeDevice: { suggestion: "「AirPods Pro」「ドライヤー」のように機器名が分かる名前で入力してください。" },
  homeRepair: { suggestion: "「スマホ修理」のように修理対象が分かる名前で入力してください。" },
  workTool: { suggestion: "「Snap-onラチェット」のように道具名が分かる名前で入力してください。" },
  gameEntertainment: { suggestion: "「PCゲーム」のように娯楽内容が分かる名前で入力してください。" },
  event: { suggestion: "「ライブチケット」のように内容が分かる名前で入力してください。" },
  dailyGoods: { suggestion: "「シャンプー」のように日用品名が分かる名前で入力してください。" },
  timeSavingService: { suggestion: "「家事代行」のように内容が分かる名前で入力してください。" },
  sponsorship: { suggestion: "「スポンサー枠」のように支援内容が分かる名前で入力してください。" },
  creatorSupport: { suggestion: "「スパチャ」「投げ銭」のように支援内容が分かる名前で入力してください。" },
  gift: { suggestion: "「プレゼント」のように内容が分かる名前で入力してください。" },
  subscription: { suggestion: "「年会費」「Netflix」のように内容が分かる名前で入力してください。" },
  fashionRepair: { suggestion: "「靴修理」のように修理対象が分かる名前で入力してください。" },
  genericRepair: { suggestion: "修理対象が分かるように、もう少し具体的に入力してください。" },
  interior: { suggestion: "「置物」「花瓶」のように種類が分かる名前で入力してください。" },
  otherProduct: { suggestion: "商品・サービス名だけでは、金額を正当化できる具体的な理由を作れませんでした。用途や内容が分かる名前で入力してください。" },
  otherService: { suggestion: "商品・サービス名だけでは、金額を正当化できる具体的な理由を作れませんでした。用途や内容が分かる名前で入力してください。" }
};

const CATEGORY_DEFINITIONS = {
  carMaintenance: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は安い話ではありません。ただ、これは部品代だけではなく、故障を広げずに今の車をそのまま使い続けるための費用です。車を止める日数や別の移動手段まで考えると、後回しにする方が高くつくことがあります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は一度の支払いとしては重めです。ただ、新しく買い替える額や故障が広がったときの追加整備と比べると、今の段階で直しておく費用として整理できます。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、見た目を変えるためではなく、普通に使える状態へ戻すためです。走れない期間や予定の組み直しまで含めて比べるなら、その場しのぎではなく運用を戻すための出費です。`
    ]
  },
  carCustom: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は高額ですが、単に飾りへ払ったわけではありません。車高や音や乗り味を自分の狙いに合わせる部品なら、安い物を入れて不満が残り、結局やり直すより最初から目的に合う物を選ぶ方が筋は通ります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は趣味の出費に見えますが、実際は見た目と乗り味をまとめて調整する費用です。純正のまま我慢して別の部品を足していくより、一回で狙いを決めた方が再作業や買い直しを減らせます。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、必要最低限を超えた調整だからこそ金額が乗っています。ただ、目的に合わない部品を何度も試すより、最初から条件に合う物へまとめて払う方が結果は素直です。`
    ]
  },
  vehiclePurchase: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は、購入価格だけを見るとむしろ低く見えることがあります。ただ、判断材料は本体価格ではなく、車検や修理費まで含めた総額です。日常の移動に使えてタクシーやレンタカーを減らせる状態なら、移動手段を確保する初期費用として説明できます。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は、安いから得だと決められる金額ではありません。ただ、維持費と修理費を確認したうえで使えるなら、同額を一時的な移動サービスに払うより、手元に移動手段が残る点で合理性があります。`,
      ({ item, perDay3Years, formattedAmount }) =>
        `${formattedAmount}の${item}は一度の支払いとしては判断しづらいですが、3年間使う前提なら1日あたり${perDay3Years}です。通勤や荷物運搬など複数用途に回せて、最後に売却できる余地まであるなら、使用期間で費用を分散する考え方は十分成り立ちます。`
    ]
  },
  transport: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は、安い移動手段と比べれば高く見えます。ただ、乗り換えや徒歩を減らして予定どおり着けるなら、移動代というより時間と手間をまとめて処理する費用として説明できます。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は地味な支出ですが、遅刻のリスクや到着までの消耗を減らすなら話は変わります。別の経路で余計に時間を使うくらいなら、その差額で予定を守ったと考える方が自然です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、ただ移動するためではなく、その後の予定まで崩さないためです。安さだけで選んで乗り換えや待ち時間が増えるなら、差額で段取りを買ったと見る方が筋が通ります。`
    ]
  },
  premiumTransit: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は高く見えますが、席の差に払ったというより、移動で体力を削らないための費用です。着いたあとに仕事や予定があるなら、安い席との差額で使える状態を買ったと考えた方が自然です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は普通席より上に見えますが、目的地でぐったりして動けなくなるなら節約の意味が薄れます。移動時間を休憩に近づけられるなら、その差額は贅沢というより準備費です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を足したのは、見栄ではなく移動後のコンディションを守るためです。到着後にそのまま動く前提なら、移動で消耗する方があとで高くつくので、この差額には十分理由があります。`
    ]
  },
  travelStay: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は安くありません。ただ、宿代や移動代を別々に見るより、その日その場所で時間を確保する費用として見た方が実態に近いです。日帰りで詰め込んで疲れるより、滞在ごとまとめて整えた支出と考えれば筋は通ります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は一度の出費としては大きめです。ただ、移動を急ぎ足で詰める代わりに滞在時間を確保できるなら、交通のやりくりや予定の無理を減らす費用として説明できます。`,
      ({ item }) =>
        `${item}は物として残る支出ではありませんが、あとから同じ条件で取り直せるとは限りません。日程と場所を押さえて無理のない動き方ができたなら、単なる気晴らしではなく機会を確保した費用です。`
    ]
  },
  food: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は、食事代だけとして見れば高く出ることがあります。ただ、場所の確保やその場で使う時間まで一緒に払っているなら、単品のごはん代だけで比べるのは雑です。食事と時間を一か所で済ませた費用として見る方が自然です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は料理だけを見ると強めです。ただ、別の店へ移動したり、落ち着ける場所を別で取ったりする手間まで考えると、一回で完結する支払いとして説明できます。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は安くありません。ただ、複数人分やコース料金まで含まれる支払いなら、一人分の普段の食事と単純比較はできません。少なくとも、食べ物だけに払ったと決めつけるのは早いです。`
    ]
  },
  shoes: {
    templates: [
      ({ item, perUse100 }) =>
        `${item}を100回履くと仮定すれば1回あたり${perUse100}です。よく履く一足なら、靴箱で眠る物ではなく外出のたびに使う前提なので、1回ごとの負担で見るとそこまで無茶な金額ではありません。`,
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら、1日あたり${perDay1Year}です。足に合わない靴を何足も試したり、結局履かない一足を増やしたりするより、出番の多い靴を一足決める費用と考える方がわかりやすいです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は高く見えても、ただの靴代で終わる話ではありません。合わせやすくてよく履けるなら、安い靴を買って結局履かない失敗より、最初から出番の多い一足を選ぶ方が無駄が少ないです。`
    ]
  },
  fashionWear: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら、1日あたり${perDay1Year}です。よく着る服は見た目だけでなく、毎回の組み合わせを早く決める役目もあるので、出番が多いなら1日ごとの負担はそこまで重くありません。`,
      ({ item, perDay3Years }) =>
        `3年間残せる前提なら、${item}は1日あたり${perDay3Years}です。流行だけで終わらず、毎年出せる定番に近い服なら、安い物を買い足して迷うより整理しやすい買い物です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、見た目に払ったというより、着回しを減らさずに済む一枚を確保するためです。合わせにくい服を増やすより、登場回数が読める服へ寄せた方が金額の説明はしやすいです。`
    ]
  },
  bag: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら、1日あたり${perDay1Year}です。通勤と休日の両方で回せて、毎回の荷物の入れ替えが減るなら、持ち物を一本化する費用としてはそこまで重くありません。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は安くありません。ただ、服に合わせやすくて毎回これで済むなら、用途ごとに中途半端な物を足していくより管理が楽です。買い分けと買い直しを減らせるなら、その金額にも理由が付きます。`,
      ({ item, perUse100 }) =>
        `${item}を100回使うと仮定すれば1回あたり${perUse100}です。荷物がまとまって、服に合わせやすくて、毎回これで済むなら、使うたびに迷わない分まで含めて十分説明できる金額です。`
    ]
  },
  fashionAccessory: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は安くありません。ただ、服全体の印象を一つでまとめやすくて、他の小物を増やさずに済むなら、単なる飾りではなく組み合わせを整える費用として説明できます。`,
      ({ item, perDay3Years }) =>
        `3年間残せる前提なら、${item}は1日あたり${perDay3Years}です。服より入れ替え頻度が低い物なら、長く使って全体の印象を安定させる前提はそこまで不自然ではありません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は一見すると小物代ですが、服を何枚も足さなくても印象を整えられるなら、見た目をまとめるための近道として十分筋が通ります。`
    ]
  },
  beautyProduct: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は高く見えても、毎回少量ずつ使う前提なら一度の支払いだけでは判断しにくいです。合わない物を何本も試すより、使い切れる物を一つ決めた方が出費が散りません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は消耗品なので長期計算はしません。ただ、仕上がりが安定して買い直しや失敗を減らせるなら、日々の手間込みで説明できます。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、ぜいたく品というより毎回の仕上がりを揃えるためです。安い物を渡り歩くより、自分に合う物を固定した方が結局ラクです。`
    ]
  },
  beautyService: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は安くありませんが、切ること自体より、整えてしばらく持たせるところまで含めた費用です。短い周期で崩れてまた行くより、先に少し整えておく方が結果的に楽です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は一回の支払いとしては大きくても、見た目を整えるだけでなく毎朝のセットのしやすさまで変わるなら、単なるその場の出費ではありません。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、切る作業ではなく、扱いやすい状態を買うためです。あとで毎日時間がかかる状態を避けられるなら、この支払いは普通に回収しやすいです。`
    ]
  },
  healthDevice: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら、1日あたり${perDay1Year}です。体を整える用途がはっきりしている物なら、必要なときにすぐ使える分、通う手間との比較で十分話が通ります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は安くありませんが、通う回数を少し減らせたり、自宅でこまめに使えたりするなら、単体の値段だけで見るより話しやすいです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、物を増やすためではなく、自宅で体の状態を整える手段を持つためです。必要なときにすぐ使えるなら、通う手間との比較で十分説明できます。`
    ]
  },
  healthApp: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、アプリそのものより、記録や管理を続けやすくするためです。手書きや自己流で抜けるより、続く仕組みへ払う方が理屈は通ります。`,
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら、1日あたり${perDay1Year}です。記録や服薬管理の抜け漏れを減らせるなら、その単価で管理のミスを減らせる仕組みとして十分説明できます。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は形に残りませんが、忘れや抜けを防ぐ仕組みとして使うなら、アプリ代というより管理コストです。`
    ]
  },
  healthService: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は安くありませんが、体を整えて終わりではなく、その後の動きやすさまで含めた費用です。重さや張りを引きずる時間が減るなら、仕事や日常へ返ってくる分まで考えてよい出費です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は一回の支払いでも、体が整って仕事や日常が回しやすくなるなら、単なる贅沢とは言いにくいです。つらいまま数日引きずる方が、結果として損が大きくなりがちです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、その場の気分ではなく、体の重さを引きずらないためです。あとで動ける時間が増えるなら、この出費は十分回収を狙えます。`
    ]
  },
  healthSubscription: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払うのは固定費に見えますが、体を動かす機会を先に確保する費用だと思えば自然です。行くたびに都度判断するより、先に枠を持つ方が続けやすいことがあります。`,
      ({ periodLabel, unitCost }) =>
        periodLabel && unitCost
          ? `${periodLabel}${unitCost}です。続ける前提の健康管理なら、必要になるたびに単発で迷うより、このくらいの単価で使える状態を持つ方が管理しやすいです。`
          : "",
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は積み上がると大きく見えても、体調を崩して動けない日を増やす方が面倒です。先に動く環境へ払っておく理屈はあります。`
    ]
  },
  gameMicrotransaction: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は形に残りませんが、比較する相手は他の娯楽です。外に出る遊びなら交通費や飲食代がかかることを考えると、娯楽予算の中で完結しているなら特別に高い支出とは言い切れません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は使い切りに見えても、外出を伴う遊びと比べるべきお金です。別の娯楽ならその都度追加の支出が乗るので、この額だけを切り出して極端と決めるのは早いです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を入れたのは、物を残すためではなく娯楽予算の使い道としてです。外で一回遊ぶたびに交通費や飲食費が増えることと比べるなら、月内で収まる範囲の課金として整理できます。`
    ]
  },
  medicalCare: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は安くありませんが、体調を悪化させないための費用なので、後回しにして長引かせる方が面倒です。早めに対処して生活を戻すなら必要な出費です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は気軽な額ではなくても、症状を引きずって時間や体力を削る方が負担です。生活を普通に戻すための費用と考えれば筋は通ります。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、贅沢ではなく不調を長引かせないためです。悪化して通院や薬が増えるより、早めに整える方が合理的です。`
    ]
  },
  insurance: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払うのは、使わない月ほどもったいなく見えます。ただ、高額な出費が一度でも来たときの振れ幅を小さくする費用だと考えれば、毎月の固定費としては説明がつきます。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は何も起きないと損に見えますが、実際は大きい支出を自分だけで抱えないための仕組みです。低頻度でも重いリスクに備える費用なら、単純な回数計算にはなりません。`,
      ({ periodLabel, unitCost }) =>
        periodLabel && unitCost
          ? `${periodLabel}${unitCost}です。使わない日の方が多い仕組みでも、高額な一回を避けるための固定費と見れば整理しやすいです。`
          : ""
    ]
  },
  homeDevice: {
    templates: [
      ({ item, perDay3Years }) =>
        `3年間使えれば、${item}は1日あたり${perDay3Years}です。毎日使う機器なら、一度の金額より日々の負担で見た方が自然です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は高く見えても、毎日触る機器なら時間と手間に返ってきます。安い物で不満を抱え続けるより、使うたびに差が出る方へ寄せるのは普通です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、物を増やすためではなく、日々の動線や作業を整えるためです。頻繁に使う前提なら、単価の大きさだけでは判断しにくいです。`
    ]
  },
  homeRepair: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、新しく買い替える費用と比べて、今ある物を使い続けるためです。データや設定のやり直しまで含めれば、修理の方が軽い話で済むことがあります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は高く見えても、買い替えと初期設定の手間、使えない期間まで考えると、今の環境を維持する費用としては合理的です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、故障そのものより、使えない時間を短くするためです。代替品を買うより早く戻せるなら、修理代として筋が通ります。`
    ]
  },
  workTool: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は高く見えても、作業時間ややり直しを減らせる道具なら、ただの物欲ではありません。使う回数があるほど、差はそのまま効率に返ってきます。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は気軽に買う額ではなくても、外注や作業遅延と比べると話が変わります。自分で処理できる回数が増えるなら、十分元を取りやすいです。`,
      ({ item, perDay3Years }) =>
        `3年間使えれば、${item}は1日あたり${perDay3Years}です。仕事や作業で繰り返し使う道具なら、一度の出費より継続して削れる手間で見た方が合理的です。`
    ]
  },
  gameEntertainment: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は物として残るとはいえ、比較する相手は他の娯楽です。外出を伴う遊びなら交通費や飲食代が乗ることを考えると、遊ぶ時間まで含めて特別高いとは限りません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は一回の出費としては強めでも、継続して遊べるなら時間単価の見え方は変わります。娯楽予算の中で回るなら不自然な支出ではありません。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、ただの物代ではなく遊ぶ時間をまとめて買うためです。別の遊びを毎回外で済ませるより支出が膨らまないなら、十分説明できます。`
    ]
  },
  event: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は物が残らない支出ですが、その日その場所でしか得られない情報や体験が目的なら、後から同じ条件で買い直せません。限定された機会に払う費用として見れば筋は通ります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は高く見えても、移動と入場をまとめた一回限りの機会なら、一般的な日用品と同じ尺度では比べにくいです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、物を残すためではなく、あとから代替しにくい接点を取りにいくためです。開催日が限られる以上、先送りできない種類の支出です。`
    ]
  },
  dailyGoods: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、毎日使う消耗品として手間を減らすためです。合わない物を何度も買い直すより、用途に合う物を選んだ方が結局散らかりません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は消耗品なので長期計算はしません。ただ、毎日使う物ほど使い勝手の差が積み重なるので、単価だけでは決めにくいです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は高く見えても、日常の作業を止めずに済んで失敗や買い直しを減らせるなら、十分説明のつく支出です。`
    ]
  },
  timeSavingService: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、面倒を外に出して空いた時間を戻すためです。自分でやると数時間かかる作業なら、その時間ごと買い戻したと考える方が自然です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は贅沢に見えても、あとで片づける負担ややり残しを減らせるなら話が変わります。時間を空けて本来の用事に回せるなら、十分合理的です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、手抜きではなく優先順位の整理です。自分で抱えるより早く終わって他の予定を守れるなら、その差額には意味があります。`
    ]
  },
  sponsorship: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は、商品を受け取る支払いではないので高く見えます。ただ、広告枠や支援先との接点、現場で何が起きるかを見る機会まで含まれるなら、単なる寄付とは整理が違います。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は一見すると大きいですが、通常の広告費や協賛費と比べるべき支出です。名前が出る場や学べる場があるなら、応援だけで終わる話ではありません。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、気持ちだけではなく接点を作るためです。活動の継続に関わりつつ、広報や関係づくりの経験まで乗るなら、単なる持ち出しではありません。`
    ]
  },
  creatorSupport: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は、一般的な娯楽費としては大きい金額です。ただ、商品代ではなく、配信活動への支援とメッセージを届ける機能に払った費用です。応援予算の範囲で、細かな投げ銭を重ねる代わりに一度で支援したなら、用途を限定した支出として整理できます。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は物として残りません。ただ、配信を見るだけではなく、活動費へ直接回る支援として払ったなら、単なる衝動買いとは切り分けられます。スポンサー費や他の娯楽費と比べて年間予算の中に収まるなら、説明の筋は通ります。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、物を受け取るためではなく、配信への支援をまとめて示すためです。少額を何度も送るより応援予算を最初に区切って管理する形なら、メッセージ付きの支出として整理しやすいです。`
    ]
  },
  gift: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は、自分だけの買い物より説明しづらく見えます。ただ、相手に合わせて選び直す手間や、無難すぎる物を重ねる失敗を避ける費用まで含めるなら、単なる物代だけでは比べにくい支出です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は自分の手元に残りませんが、関係の場面で雑に済ませる方が後に残ります。相手に合わせてきちんと選ぶ前提なら、安さだけで決めない理由としては十分筋が通ります。`
    ]
  },
  subscription: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払うのは一見すると固定費ですが、必要な都度探して申し込む手間まで含めると、継続して使う前提の方がむしろ整理しやすいです。単発の積み重ねと比べて利用頻度があるなら、定額化する理由は十分あります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は毎月見ると重く感じますが、使うたびに単発で払う場合や、必要なときに毎回探す手間と比べると、定額で常に使える状態を持つ意味はあります。`,
      ({ periodLabel, unitCost }) =>
        periodLabel && unitCost
          ? `${periodLabel}${unitCost}です。継続前提で使うサービスなら、必要になるたびに都度判断するより、このくらいの単価で使える状態を持つ方が管理しやすいです。`
          : ""
    ]
  },
  fashionRepair: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、新しく買い替える費用と比べて、今ある物を使い続けるためです。修理して寿命を延ばせるなら、次を買うより負担が小さいことがあります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は新しく買う額ではなくても、気に入っている物をそのまま使える価値があるなら、修理費として話がつきます。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、傷みを放置して使えなくなる前に手を入れるためです。買い替えより軽い出費で済むなら十分です。`
    ]
  },
  genericRepair: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、新しく買い替える費用と比べて、今ある物を使い続けるためです。修理して使える状態へ戻せるなら、使用停止の期間を避ける意味があります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は高く見えても、買い替えと初期設定の手間を含めるなら、今の環境を維持する費用としては説明しやすいです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、故障そのものより、使えない時間を短くするためです。代替品を用意するより軽いなら、修理代としては普通です。`
    ]
  },
  interior: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は実用品と比べると説明しづらいです。ただ、部屋の印象を長く固定できて、安い飾りを何度も入れ替えるのを減らせるなら、一度で空間を整える費用として考えられます。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は生活必需品ではありません。ただ、毎日目に入る場所の雰囲気を決める物なら、細かい物を買い足して散らかすより、一つで空間の軸を作る方が支出の筋は通ります。`,
      ({ item, perDay3Years }) =>
        `3年間そのまま置く前提なら、${item}は1日あたり${perDay3Years}です。気分だけの買い物に見えても、長く部屋に置いて空間の印象を決めるなら、単発の額だけでは判断しにくいです。`
    ]
  },
  otherProduct: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は一度の支出としては大きめです。ただ、これが何に効く買い物なのかが見えないままだと、買い直し回避なのか時短なのかも説明できません。用途まで言えないなら、金額を正当化する材料が足りません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は、商品名だけでは比較相手を置きにくいです。何を減らせる物なのか、どこで使う物なのかが分からないと、筋道だった言い訳までは組み立てられません。`
    ]
  },
  otherService: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}は単発の出費として見れば済みますが、何を任せたサービスなのかが見えないと比較ができません。時間短縮なのか手間回避なのかが言えない以上、この名前だけでロジックを立てるのは厳しいです。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は金額だけなら評価しにくいものの、内容が曖昧なままでは正当化の軸が作れません。別の手段より何がラクだったのかまで言えないなら、言い訳としては弱いままです。`
    ]
  }
};

const VALIDATION_RULES = [
  {
    test: (context, text) => context.categoryName !== "shoes" && /履く|履ける/.test(text),
    reason: "靴以外で履く表現が出ています。"
  },
  {
    test: (context, text) => context.categoryName !== "fashionWear" && /着る|着回し/.test(text),
    reason: "服以外で着る表現が出ています。"
  },
  {
    test: (context, text) => context.categoryName !== "bag" && /荷物がまとまる|入れ替え/.test(text),
    reason: "バッグ以外でバッグ向け表現が出ています。"
  },
  {
    test: (context, text) => context.categoryName !== "travelStay" && /宿代|宿泊/.test(text),
    reason: "宿泊以外で宿泊向け表現が出ています。"
  },
  {
    test: (context, text) =>
      ["food", "gameMicrotransaction", "beautyProduct", "dailyGoods", "beautyService", "healthService", "medicalCare", "transport", "premiumTransit", "travelStay", "event", "timeSavingService", "sponsorship", "gift", "subscription", "otherService", "genericRepair", "homeRepair", "fashionRepair", "carMaintenance"].includes(context.categoryName) &&
      /100回|1回あたり|3年間使えれば/.test(text),
    reason: "長期利用向けの計算が不自然なカテゴリです。"
  },
  {
    test: (context, text) => context.categoryName === "gameMicrotransaction" && /100回|1回あたり|資産/.test(text),
    reason: "ゲーム課金に回数計算や資産表現が出ています。"
  },
  {
    test: (context, text) => context.categoryName !== "carCustom" && /純正/.test(text) && !/比べ/.test(text),
    reason: "車カスタム以外で純正の話をしています。"
  },
  {
    test: (context, text) =>
      context.billingPeriod === "monthly" && /1日あたり.*年/.test(text),
    reason: "月額なのに年額扱いの計算が出ています。"
  }
];

const CATEGORY_REASON_PATTERNS = {
  carMaintenance: [/故障/, /整備/, /走れ/, /移動手段/, /追加整備/],
  carCustom: [/乗り味/, /純正/, /再作業/, /車高/, /部品/],
  vehiclePurchase: [/維持費/, /修理費/, /総額/, /タクシー/, /レンタカー/, /複数用途/, /売却/, /使用期間/],
  transport: [/乗り換え/, /待ち時間/, /遅刻/, /段取り/, /徒歩/],
  premiumTransit: [/体力/, /コンディション/, /普通席/, /到着後/, /休憩/],
  travelStay: [/滞在時間/, /日帰り/, /日程/, /宿代/, /移動代/],
  food: [/食事/, /場所/, /コース/, /移動/, /時間/],
  shoes: [/履く/, /出番/, /外出/, /靴/, /足に合/],
  fashionWear: [/着回し/, /組み合わせ/, /定番/, /毎年/, /服/],
  bag: [/荷物/, /入れ替え/, /通勤/, /休日/, /バッグ/],
  fashionAccessory: [/印象/, /小物/, /組み合わせ/, /服/, /まとめ/],
  beautyProduct: [/仕上がり/, /買い直し/, /使い切/, /合わない/, /毎回/],
  beautyService: [/整えて/, /セット/, /周期/, /扱いやすい/, /毎朝/],
  healthDevice: [/自宅/, /通う/, /必要なとき/, /体を整/, /手段/],
  healthApp: [/記録/, /管理/, /服薬/, /抜け漏れ/, /仕組み/],
  healthService: [/体を整/, /引きず/, /動きやす/, /仕事/, /日常/],
  healthSubscription: [/機会/, /続け/, /枠/, /健康管理/, /動く環境/],
  gameMicrotransaction: [/娯楽予算/, /交通費/, /飲食費/, /外出/, /課金/],
  medicalCare: [/不調/, /悪化/, /通院/, /薬/, /生活/],
  insurance: [/高額/, /リスク/, /固定費/, /振れ幅/, /備え/],
  homeDevice: [/毎日/, /動線/, /作業/, /機器/, /時間/],
  homeRepair: [/買い替え/, /設定/, /使えない期間/, /修理/, /今の環境/],
  workTool: [/作業時間/, /やり直し/, /外注/, /効率/, /道具/],
  gameEntertainment: [/娯楽/, /遊ぶ時間/, /交通費/, /飲食費/, /継続/],
  event: [/限定/, /開催日/, /体験/, /入場/, /接点/],
  dailyGoods: [/毎日/, /消耗品/, /買い直し/, /失敗/, /手間/],
  timeSavingService: [/時間/, /面倒/, /作業/, /優先順位/, /予定/],
  sponsorship: [/広告/, /協賛/, /接点/, /広報/, /支援/],
  creatorSupport: [/配信/, /支援/, /応援予算/, /娯楽費/, /メッセージ/, /活動費/, /スポンサー費/, /年間予算/],
  gift: [/相手/, /選び直し/, /関係/, /無難/, /贈り物/],
  subscription: [/定額/, /都度/, /継続/, /単発/, /管理/],
  fashionRepair: [/修理/, /買い替え/, /寿命/, /使い続け/, /傷み/],
  genericRepair: [/修理/, /買い替え/, /使えない時間/, /戻す/, /維持/],
  interior: [/部屋/, /空間/, /印象/, /飾り/, /置く/],
  otherProduct: [/用途/, /比較/, /買い直し/, /時短/],
  otherService: [/時間短縮/, /手間/, /別の手段/, /サービス/]
};

const POSITIVE_COMPARISON = /比べ|比較|より|単純比較|別の|まとめて|買い替え|都度|普通席|外注|交通費|飲食費|安い物|純正/;
const POSITIVE_LOSS_AVOID = /減ら|避け|防げ|守れ|崩さ|引きず|止める|使えない|やり直し|散らか|悪化|回避/;
const POSITIVE_TIME = /1日あたり|1回あたり|毎日|通勤|休日|乗り換え|待ち時間|到着後|作業時間|日帰り|100回|3年間|1年間|都度/;
const POSITIVE_CONDITIONAL = /なら|前提|場合|含まれる|考えると|仮定/;
const NEGATIVE_GENERIC = /欲しいと思った|自分の判断|納得している|完璧な理由|生活に支障|好きなら|気分が上がる|無駄とは限らない|意味がある|それで十分|自分への投資|経験にお金/;
const NEGATIVE_WEAK = /ありです|悪くありません|十分です|話がつきます/;

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function toHalfWidth(value) {
  return value
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, " ");
}

function normalizeInput(value) {
  return toHalfWidth(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function detectAmbiguousInput(normalizedItemName) {
  return AMBIGUOUS_INPUTS[normalizedItemName] || "";
}

function detectSpecificExceptions(normalizedItemName) {
  if (hasAny(normalizedItemName, WORDS.excludedVehicle)) {
    return "nonVehicle";
  }

  if (hasAny(normalizedItemName, WORDS.excludedMedical)) {
    return "nonMedical";
  }

  if (hasAny(normalizedItemName, WORDS.hotelFood)) {
    return "hotelFood";
  }

  if (hasAny(normalizedItemName, WORDS.gameMicrotransaction)) {
    return "gameMicrotransaction";
  }

  if (hasAny(normalizedItemName, WORDS.healthApp)) {
    return "healthApp";
  }

  if (normalizedItemName.includes("機種交換")) {
    return "deviceReplacement";
  }

  if (normalizedItemName.includes("プレゼント交換")) {
    return "giftExchange";
  }

  return "";
}

function detectActionType(normalizedItemName) {
  if (hasAny(normalizedItemName, WORDS.repair) || hasAny(normalizedItemName, WORDS.repairLikeExchange)) {
    return "repair";
  }

  if (normalizedItemName.includes("交換")) {
    return "exchange";
  }

  if (hasAny(normalizedItemName, ["購入", "買った", "買い物"])) {
    return "purchase";
  }

  return "generic";
}

function detectBillingPeriod(normalizedItemName) {
  if (hasAny(normalizedItemName, WORDS.annualWords)) {
    return "yearly";
  }

  if (hasAny(normalizedItemName, WORDS.recurringWords)) {
    return "monthly";
  }

  return "single";
}

function detectConsumableType(normalizedItemName, categoryName) {
  if (["beautyProduct", "dailyGoods"].includes(categoryName)) {
    return "consumable";
  }

  if (["homeDevice", "healthDevice", "shoes", "fashionWear", "bag", "fashionAccessory", "workTool", "interior"].includes(categoryName)) {
    return "durable";
  }

  return "other";
}

function formatCurrency(value) {
  return `${Number(value).toLocaleString("ja-JP")}円`;
}

function calculatePerUse(amount, count) {
  return formatCurrency(Math.round(amount / count));
}

function calculatePerDay(amount, days) {
  return formatCurrency(Math.round(amount / days));
}

function calculateUnitCost(amount, billingPeriod) {
  if (billingPeriod === "monthly") {
    return calculatePerDay(amount, 30);
  }

  if (billingPeriod === "yearly") {
    return calculatePerDay(amount, 365);
  }

  return "";
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function shuffle(array) {
  const clone = [...array];

  for (let i = clone.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [clone[i], clone[j]] = [clone[j], clone[i]];
  }

  return clone;
}

function getRecentList(key) {
  if (!recentExcusesByKey.has(key)) {
    recentExcusesByKey.set(key, []);
  }

  return recentExcusesByKey.get(key);
}

function detectRepairContext(normalizedItemName, specificException, actionType) {
  const isRepair = actionType === "repair";
  const hasVehicleWord = specificException !== "nonVehicle" && hasAny(normalizedItemName, WORDS.vehicle);
  const hasHomeDeviceWord = hasAny(normalizedItemName, WORDS.homeDevice);
  const hasFashionRepairWord = hasAny(normalizedItemName, WORDS.fashionRepair);

  let domain = "none";

  if (isRepair && hasVehicleWord) {
    domain = "vehicle";
  } else if (isRepair && hasHomeDeviceWord) {
    domain = "homeDevice";
  } else if (isRepair && hasFashionRepairWord) {
    domain = "fashion";
  } else if (isRepair) {
    domain = "generic";
  }

  return {
    isRepair,
    domain
  };
}

function detectItemType(normalizedItemName, repairContext, specificException) {
  if (specificException === "hotelFood") {
    return { categoryName: "food" };
  }

  if (specificException === "gameMicrotransaction") {
    return { categoryName: "gameMicrotransaction" };
  }

  if (specificException === "healthApp") {
    return { categoryName: "healthApp" };
  }

  if (specificException === "deviceReplacement") {
    return { categoryName: "homeDevice" };
  }

  if (specificException === "giftExchange") {
    return { categoryName: "gift" };
  }

  if (repairContext.domain === "vehicle") {
    return { categoryName: "carMaintenance" };
  }

  if (repairContext.domain === "homeDevice") {
    return { categoryName: "homeRepair" };
  }

  if (repairContext.domain === "fashion") {
    return { categoryName: "fashionRepair" };
  }

  if (repairContext.domain === "generic") {
    return { categoryName: "genericRepair" };
  }

  if (hasAny(normalizedItemName, WORDS.insurance)) {
    return { categoryName: "insurance" };
  }

  if (specificException !== "nonMedical" && hasAny(normalizedItemName, WORDS.medicalCare)) {
    return { categoryName: "medicalCare" };
  }

  if (hasAny(normalizedItemName, WORDS.creatorSupport)) {
    return { categoryName: "creatorSupport" };
  }

  if (hasAny(normalizedItemName, WORDS.sponsorship)) {
    return { categoryName: "sponsorship" };
  }

  if (hasAny(normalizedItemName, WORDS.premiumTransit)) {
    return { categoryName: "premiumTransit" };
  }

  if (hasAny(normalizedItemName, WORDS.vehicleMaintenance)) {
    return { categoryName: "carMaintenance" };
  }

  if (hasAny(normalizedItemName, WORDS.carCustom)) {
    return { categoryName: "carCustom" };
  }

  if (hasAny(normalizedItemName, WORDS.vehiclePurchase)) {
    return { categoryName: "vehiclePurchase" };
  }

  if (hasAny(normalizedItemName, WORDS.transport)) {
    return { categoryName: "transport" };
  }

  if (hasAny(normalizedItemName, WORDS.travelStay)) {
    return { categoryName: "travelStay" };
  }

  if (hasAny(normalizedItemName, WORDS.event)) {
    return { categoryName: "event" };
  }

  if (hasAny(normalizedItemName, WORDS.timeSavingService)) {
    return { categoryName: "timeSavingService" };
  }

  if (hasAny(normalizedItemName, WORDS.healthSubscription)) {
    return { categoryName: "healthSubscription" };
  }

  if (hasAny(normalizedItemName, WORDS.healthService)) {
    return { categoryName: "healthService" };
  }

  if (hasAny(normalizedItemName, WORDS.beautyService)) {
    return { categoryName: "beautyService" };
  }

  if (hasAny(normalizedItemName, WORDS.beautyProduct)) {
    return { categoryName: "beautyProduct" };
  }

  if (hasAny(normalizedItemName, WORDS.healthDevice)) {
    return { categoryName: "healthDevice" };
  }

  if (hasAny(normalizedItemName, WORDS.food)) {
    return { categoryName: "food" };
  }

  if (hasAny(normalizedItemName, WORDS.dailyGoods)) {
    return { categoryName: "dailyGoods" };
  }

  if (hasAny(normalizedItemName, WORDS.gameEntertainment)) {
    return { categoryName: "gameEntertainment" };
  }

  if (hasAny(normalizedItemName, WORDS.shoes)) {
    return { categoryName: "shoes" };
  }

  if (hasAny(normalizedItemName, WORDS.bag)) {
    return { categoryName: "bag" };
  }

  if (hasAny(normalizedItemName, WORDS.fashionAccessory)) {
    return { categoryName: "fashionAccessory" };
  }

  if (hasAny(normalizedItemName, WORDS.fashionWear)) {
    return { categoryName: "fashionWear" };
  }

  if (hasAny(normalizedItemName, WORDS.gift)) {
    return { categoryName: "gift" };
  }

  if (hasAny(normalizedItemName, WORDS.subscription) || hasAny(normalizedItemName, WORDS.annualWords)) {
    return { categoryName: "subscription" };
  }

  if (hasAny(normalizedItemName, WORDS.interior)) {
    return { categoryName: "interior" };
  }

  if (hasAny(normalizedItemName, WORDS.workTool)) {
    return { categoryName: "workTool" };
  }

  if (hasAny(normalizedItemName, WORDS.homeDevice)) {
    return { categoryName: "homeDevice" };
  }

  if (hasAny(normalizedItemName, WORDS.serviceWords) || hasAny(normalizedItemName, WORDS.recurringWords)) {
    return { categoryName: "otherService" };
  }

  return { categoryName: "otherProduct" };
}

function detectCategory(normalizedItemName, repairContext, specificException) {
  return detectItemType(normalizedItemName, repairContext, specificException).categoryName;
}

function buildTemplateData(itemName, amount, context) {
  const unitCost = calculateUnitCost(amount, context.billingPeriod);
  const periodLabel =
    context.billingPeriod === "monthly"
      ? `月額${formatCurrency(amount)}なら、1日あたり約`
      : context.billingPeriod === "yearly"
        ? `年額${formatCurrency(amount)}なら、1日あたり約`
        : "";

  return {
    item: itemName,
    formattedAmount: formatCurrency(amount),
    perUse100: calculatePerUse(amount, 100),
    perDay1Year: calculatePerDay(amount, 365),
    perDay3Years: calculatePerDay(amount, 365 * 3),
    periodLabel,
    unitCost
  };
}

function getCompatibleTemplates(categoryName) {
  const definition = CATEGORY_DEFINITIONS[categoryName];
  return definition ? definition.templates : [];
}

function validateGeneratedText(context, text) {
  return (
    VALIDATION_RULES.every((rule) => !rule.test(context, text)) &&
    !BANNED_EMPTY_JUSTIFICATIONS.some((phrase) => text.includes(phrase))
  );
}

function scoreCandidate(context, text) {
  let score = 0;

  if (CATEGORY_REASON_PATTERNS[context.categoryName]?.some((pattern) => pattern.test(text))) {
    score += 2;
  }

  if (text.includes(context.formattedAmount) || /円/.test(text)) {
    score += 1;
  }

  if (POSITIVE_COMPARISON.test(text)) {
    score += 2;
  }

  if (POSITIVE_LOSS_AVOID.test(text)) {
    score += 2;
  }

  if (POSITIVE_TIME.test(text)) {
    score += 1;
  }

  if (POSITIVE_CONDITIONAL.test(text)) {
    score += 1;
  }

  if (NEGATIVE_GENERIC.test(text)) {
    score -= 4;
  }

  if (BANNED_EMPTY_JUSTIFICATIONS.some((phrase) => text.includes(phrase))) {
    score -= 8;
  }

  if (NEGATIVE_WEAK.test(text)) {
    score -= 1;
  }

  if ((context.categoryName === "otherProduct" || context.categoryName === "otherService") && !/用途|比較|材料|曖昧/.test(text)) {
    score -= 3;
  }

  return score;
}

function minimumScore(categoryName) {
  if (["otherProduct", "otherService"].includes(categoryName)) {
    return 7;
  }

  if (["gift", "subscription", "interior"].includes(categoryName)) {
    return 5;
  }

  return 4;
}

function buildCandidateDetails(context) {
  const templates = getCompatibleTemplates(context.categoryName);
  const data = buildTemplateData(context.itemName, context.amount, context);
  const details = [];

  for (const template of templates) {
    const text = template(data);
    if (!text) {
      continue;
    }

    if (!validateGeneratedText(context, text)) {
      continue;
    }

    const score = scoreCandidate(context, text);

    if (score >= minimumScore(context.categoryName)) {
      details.push({ text, score });
    }
  }

  return details;
}

function buildCandidates(context) {
  return buildCandidateDetails(context).map((detail) => detail.text);
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
  const normalizedItemName = normalizeInput(rawItemName);
  const displayItemName = toHalfWidth(rawItemName).trim().replace(/\s+/g, " ");
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

function generateExcuseText(itemName, normalizedItemName, amount) {
  const ambiguousHint = detectAmbiguousInput(normalizedItemName);
  if (ambiguousHint) {
    return {
      ok: false,
      message: ambiguousHint
    };
  }

  const specificException = detectSpecificExceptions(normalizedItemName);
  const actionType = detectActionType(normalizedItemName);
  const repairContext = detectRepairContext(normalizedItemName, specificException, actionType);
  const categoryName = detectCategory(normalizedItemName, repairContext, specificException);
  const meta = CATEGORY_META[categoryName];

  if (!meta) {
    return {
      ok: false,
      message: "商品・サービス名だけでは、金額を正当化できる具体的な理由を作れませんでした。用途や内容が分かる名前で入力してください。"
    };
  }

  if (["otherProduct", "otherService"].includes(categoryName)) {
    return {
      ok: false,
      message: meta.suggestion
    };
  }

  const context = {
    itemName,
    normalizedItemName,
    amount,
    formattedAmount: formatCurrency(amount),
    categoryName,
    specificException,
    actionType,
    repairContext,
    billingPeriod: detectBillingPeriod(normalizedItemName),
    consumableType: detectConsumableType(normalizedItemName, categoryName)
  };

  const candidates = buildCandidates(context);

  if (candidates.length === 0) {
    return {
      ok: false,
      message: meta.suggestion
    };
  }

  const recentKey = `${categoryName}:${normalizedItemName}:${amount}`;
  const recentList = getRecentList(recentKey);
  const unused = candidates.filter((candidate) => !recentList.includes(candidate));
  const pool = unused.length > 0 ? unused : candidates;
  const excuse = pickRandom(shuffle(pool));

  recentList.push(excuse);
  if (recentList.length > 16) {
    recentList.shift();
  }

  return {
    ok: true,
    categoryName,
    categoryLabel: CATEGORY_LABELS[categoryName],
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
  normalizeInput,
  detectAmbiguousInput,
  detectSpecificExceptions,
  detectItemType,
  detectCategory,
  detectRepairContext,
  detectActionType,
  detectBillingPeriod,
  detectConsumableType,
  getCompatibleTemplates,
  buildCandidateDetails,
  buildCandidates,
  generateExcuseText,
  validateGeneratedText,
  scoreCandidate
};
