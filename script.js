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

const recentExcusesByKey = new Map();

const CATEGORY_LABELS = {
  carMaintenance: "車の整備・修理",
  carCustom: "車のカスタムパーツ",
  transport: "交通・移動",
  travelStay: "旅行・宿泊",
  food: "食事",
  shoes: "靴",
  fashion: "ファッション",
  beautyProduct: "美容用品",
  beautyService: "美容サービス",
  healthFitness: "健康・運動",
  homeDevice: "家電・デジタル機器",
  workTool: "仕事道具",
  gameEntertainment: "ゲーム・娯楽",
  event: "映画・ライブ・イベント",
  dailyGoods: "日用品",
  timeSavingService: "家事代行・時短サービス",
  sponsorship: "スポンサー・応援・寄付",
  gift: "プレゼント",
  subscription: "サブスクリプション",
  otherProduct: "その他の商品",
  otherService: "その他のサービス"
};

const AMBIGUOUS_INPUTS = {
  "オイル": "「エンジンオイル」や「ヘアオイル」のように、もう少し具体的に入力してください。",
  "チケット": "「映画チケット」や「ライブチケット」のように、もう少し具体的に入力してください。",
  "部品": "「洗濯機の交換部品」のように、何の部品か具体的に入力してください。",
  "サービス": "どんなサービスか分かるように、もう少し具体的に入力してください。",
  "メンバーシップ": "「ジムの月額会員」など、内容が分かる形で入力してください。",
  "用品": "何に使う用品か分かるように、もう少し具体的に入力してください。"
};

const CATEGORY_RULES = [
  {
    name: "sponsorship",
    nature: "support",
    match: (text) => hasAny(text, ["スポンサー枠", "スポンサー", "支援", "投げ銭", "スパチャ", "fanbox", "patreon", "寄付"])
  },
  {
    name: "adultService",
    nature: "singleService",
    disabled: true,
    match: (text) => hasAny(text, ["風俗", "デリヘル", "ピンサロ", "ホテヘル", "ソープランド", "性感ヘルス"])
  },
  {
    name: "premiumTransit",
    aliasOf: "transport",
    nature: "transport",
    match: (text) => hasAny(text, ["グリーン車", "プレミアムシート", "ファーストクラス", "ビジネスクラス"])
  },
  {
    name: "carCustom",
    nature: "custom",
    match: (text) => hasAny(text, ["車高調", "マフラー", "ホイール", "エアロ", "スポイラー", "サスペンション"])
  },
  {
    name: "carMaintenance",
    nature: "maintenance",
    match: (text) =>
      hasAny(text, [
        "車検",
        "エンジンオイル交換",
        "エンジンオイル",
        "ミッションオイル",
        "オイル交換",
        "タイヤ交換",
        "修理",
        "整備",
        "点検",
        "バッテリー交換",
        "ブレーキパッド",
        "ドラレコ"
      ])
  },
  {
    name: "dailyGoods",
    nature: "consumable",
    match: (text) => hasAny(text, ["ハンドソープ", "ボディソープ", "洗剤", "ティッシュ", "トイレットペーパー", "スポンジ"])
  },
  {
    name: "beautyProduct",
    nature: "consumable",
    match: (text) =>
      hasAny(text, ["ヘアオイル", "美容液", "化粧水", "乳液", "コスメ", "日焼け止め", "スキンケア", "香水", "ヘアミルク"])
  },
  {
    name: "beautyService",
    nature: "singleService",
    match: (text) => hasAny(text, ["美容院", "ヘアサロン", "散髪", "カット", "カラー", "ネイル", "まつげ", "脱毛"])
  },
  {
    name: "healthFitness",
    nature: "serviceOrRecurring",
    match: (text) =>
      hasAny(text, [
        "整体",
        "マッサージ",
        "もみほぐし",
        "ジム",
        "ジムメンバーシップ",
        "パーソナルジム",
        "サウナ",
        "ヘルスケア",
        "ヘルスメーター",
        "服薬管理",
        "健康管理"
      ])
  },
  {
    name: "gameEntertainment",
    nature: "entertainment",
    match: (text) =>
      hasAny(text, [
        "pcゲーム",
        "スマホゲーム",
        "ゲーム課金",
        "課金",
        "steam",
        "switch",
        "playstation",
        "xbox",
        "ゲーム",
        "漫画",
        "フィギュア",
        "アニメ",
        "プラモ",
        "小説"
      ])
  },
  {
    name: "event",
    nature: "experience",
    match: (text) =>
      hasAny(text, ["映画チケット", "ライブチケット", "映画館", "美術館", "展覧会", "入場料", "観劇", "フェス", "コンサート", "舞台"])
  },
  {
    name: "travelStay",
    nature: "experience",
    match: (text) => hasAny(text, ["旅行", "ホテル宿泊", "ホテル", "旅館", "宿泊", "温泉宿", "航空券", "ツアー"])
  },
  {
    name: "transport",
    nature: "transport",
    match: (text) => hasAny(text, ["タクシー", "駐車場代", "駐車料金", "駐車場", "ガソリン", "高速代", "交通費", "電車代", "バス代", "新幹線"])
  },
  {
    name: "timeSavingService",
    nature: "singleService",
    match: (text) => hasAny(text, ["家事代行", "清掃代行", "洗濯代行", "宿題代行", "代行サービス"])
  },
  {
    name: "workTool",
    nature: "durable",
    match: (text) => hasAny(text, ["仕事用ノートpc", "仕事用pc", "仕事用スマホ", "仕事用iphone", "業務用パソコン", "工具", "作業用工具"])
  },
  {
    name: "homeDevice",
    nature: "durable",
    match: (text) =>
      hasAny(text, [
        "airpods",
        "airpods pro",
        "イヤホン",
        "ヘッドホン",
        "iphone",
        "ipad",
        "スマホ",
        "パソコン",
        "ノートpc",
        "macbook",
        "タブレット",
        "洗濯機",
        "冷蔵庫",
        "掃除機",
        "電子レンジ",
        "エアコン",
        "モニター",
        "ディスプレイ"
      ])
  },
  {
    name: "shoes",
    nature: "durable",
    match: (text) => hasAny(text, ["スニーカー", "靴", "ブーツ", "ローファー", "パンプス", "サンダル"])
  },
  {
    name: "fashion",
    nature: "durable",
    match: (text) => hasAny(text, ["コート", "シャツ", "デニム", "パンツ", "ジャケット", "帽子", "洋服", "バッグ"])
  },
  {
    name: "gift",
    nature: "genericProduct",
    match: (text) => hasAny(text, ["プレゼント", "ギフト", "贈り物"])
  },
  {
    name: "subscription",
    nature: "recurringService",
    match: (text) => hasAny(text, ["サブスク", "月額", "定期便", "netflix", "spotify", "youtube premium"])
  },
  {
    name: "food",
    nature: "food",
    match: (text) =>
      hasAny(text, ["海鮮丼", "焼肉", "寿司", "ラーメン", "カフェ", "ランチ", "ディナー", "ごはん", "弁当", "丼", "定食", "うなぎ", "食事"])
  },
  {
    name: "otherService",
    nature: "singleService",
    match: (text) => hasAny(text, ["サービス", "レッスン", "相談", "代行"])
  }
];

const CATEGORY_DEFINITIONS = {
  carMaintenance: {
    label: CATEGORY_LABELS.carMaintenance,
    suggestion: "整備内容が分かるように「車検」や「エンジンオイル交換」のように入力してください。",
    intros: [
      "ちゃんと走れる状態を保つための出費なら、先に払う意味があります。",
      "整備や修理は、見た目より普通に使える状態を守るためのお金です。",
      "不安なく乗れる状態に戻るなら、その時点で価値があります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、贅沢ではなく普通に使える状態を保つためです。${intro} 安心して乗れるなら、この出費は必要経費です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は軽い話ではありませんが、後回しにせず整えたなら十分まともです。${intro} ちゃんと使える状態に戻るなら、払う意味はあります。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、派手さより実用を優先した形です。${intro} 乗るたびの不安が減るなら、それで十分です。`
    ]
  },
  carCustom: {
    label: CATEGORY_LABELS.carCustom,
    suggestion: "カスタム内容が分かるように「車高調」や「マフラー」のように入力してください。",
    intros: [
      "カスタムは修理とは別で、乗っていて気分が上がるところにちゃんと意味があります。",
      "見た目や走りが自分の好みに寄るなら、その満足は案外大きいです。",
      "好きで手を入れた部分があると、乗る時間そのものが少し楽しくなります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、壊れたからではなく乗る楽しさを上げるためです。${intro} 好きで付けたと思えるなら、十分納得できます。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は実用品というより趣味の出費ですが、そのぶん満足は分かりやすいです。${intro} 乗るたびに気分が上がるなら悪くありません。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、必要最低限ではなく自分の好みに寄せるためです。${intro} そこに価値を感じているなら十分ありです。`
    ]
  },
  transport: {
    label: CATEGORY_LABELS.transport,
    suggestion: "交通手段が分かるように「タクシー代」や「駐車場代」のように入力してください。",
    intros: [
      "移動そのものにお金を使うのは、生活を回すための基本コストです。",
      "目的地まで楽にたどり着けるだけで、その日のしんどさは変わります。",
      "時間や体力を無駄にしないなら、交通費にはちゃんと意味があります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、単なる出費というより移動を成立させるためです。${intro} ちゃんと着けている時点で十分役に立っています。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は地味でも、移動をスムーズにするためのお金です。${intro} その日の手間や疲れが減るなら、普通に意味があります。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、時間か体力のどちらかを守るためだと思えば自然です。${intro} それで一日が回るなら十分です。`
    ]
  },
  premiumTransit: {
    label: CATEGORY_LABELS.transport,
    suggestion: "移動内容が分かるように「新幹線グリーン車」のように入力してください。",
    intros: [
      "移動で疲れすぎないことにお金を使うのは、思ったよりちゃんと意味があります。",
      "目的地に着いた時点でぐったりしていないだけで、かなり違います。",
      "移動を少しラクにする出費は、贅沢というより消耗を減らすためのものです。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、贅沢というより移動で疲れないためです。${intro} 目的地でちゃんと動けるなら、結果的に得しています。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は高く見えても、移動でぐったりしないだけで意味があります。${intro} その後の動きやすさまで含めれば、必要な経費です。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を足したのは、席の違いというより体力を残すためです。${intro} 移動で潰れないなら、そのぶんは十分回収できます。`
    ]
  },
  travelStay: {
    label: CATEGORY_LABELS.travelStay,
    suggestion: "旅行内容が分かるように「ホテル宿泊」や「旅館」のように入力してください。",
    intros: [
      "旅行や宿泊は、その場で終わるようで案外あとに残ります。",
      "行けるときに行っておく方が、あとから変に引っかかりにくいです。",
      "ちゃんと休めた、行ってよかったと思えたなら、その時点で意味があります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、移動や宿代そのものより、その時間をちゃんと取ったという話です。${intro} それなら、ただ消えたお金ではありません。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は安い話ではなくても、気分が切り替わったなら十分ありです。${intro} 行かなかった後悔を避けられるなら、なおさら悪くありません。`,
      ({ item, intro }) =>
        `${item}は物が残る買い物ではありませんが、ちゃんと休めたとか楽しかったが残るなら成立しています。${intro}`
    ]
  },
  food: {
    label: CATEGORY_LABELS.food,
    suggestion: "食事内容が分かるように「海鮮丼」や「焼肉」のように入力してください。",
    intros: [
      "ちゃんと満足できる食事は、その日の機嫌まで変えます。",
      "食事は空腹を埋めるだけではなく、気分を戻す役目もあります。",
      "食べてよかったが残るなら、その時点で十分意味があります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、ただ食べるためではなく、ちゃんと満足するためです。${intro} それなら、この出費は普通に成立しています。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は安いとは言いませんが、満足できたなら高すぎるとも言えません。${intro} 妥協して物足りなさが残るより、ずっとましです。`,
      ({ item, intro }) =>
        `${item}は一食として見ると強めでも、ちゃんと気分まで上がったなら意味があります。${intro} ただ高いだけの出費ではありません。`
    ]
  },
  shoes: {
    label: CATEGORY_LABELS.shoes,
    suggestion: "靴の種類が分かるように「スニーカー」など具体的に入力してください。",
    intros: [
      "よく履く一足なら、値段は使うたびに薄まっていきます。",
      "履きやすくて出番が多い靴は、結局いちばん元が取りやすいです。",
      "気に入った靴があるだけで、出かける気分はかなり変わります。"
    ],
    templates: [
      ({ item, perUse100, intro }) =>
        `${item}を100回履くと仮定すれば1回あたり${perUse100}です。${intro} それだけ履くなら、けして高すぎる買い物ではありません。`,
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${intro} 毎回ちゃんと履くなら、普通に元は取れます。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、勢いだけではなく出番があるからです。${intro} よく履くなら、その金額はちゃんと回収できます。`
    ]
  },
  fashion: {
    label: CATEGORY_LABELS.fashion,
    suggestion: "服の種類が分かるように「コート」や「帽子」のように入力してください。",
    intros: [
      "合わせやすい服は、結局いちばん出番が多くなります。",
      "気に入っている服があるだけで、外に出る気分はかなり違います。",
      "長く着る前提なら、値段だけで高い安いは決めにくいです。"
    ],
    templates: [
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${intro} ちゃんと着るなら、その金額は十分ありです。`,
      ({ item, perDay3Years, intro }) =>
        `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${intro} 長く付き合えるなら、かなり落ち着いた買い方です。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、見た目だけではなく出番を見込んでいるからです。${intro} よく使うなら、十分納得できます。`
    ]
  },
  beautyProduct: {
    label: CATEGORY_LABELS.beautyProduct,
    suggestion: "美容用品名が分かるように「ヘアオイル」など具体的に入力してください。",
    intros: [
      "毎日の身支度が少しラクになるだけで、気分はかなり違います。",
      "美容用品は見た目だけではなく、自分の気分を整える道具でもあります。",
      "使うたびに小さく効くものなら、案外ちゃんと元は取れます。"
    ],
    templates: [
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${intro} そのくらいで調子よく過ごせるなら、十分ありです。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、贅沢というより自分を整えるためです。${intro} 毎日の満足度が上がるなら、悪くありません。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は派手に見えても、使って気分が整うなら意味があります。${intro} その効果があるなら、この出費は成立しています。`
    ]
  },
  beautyService: {
    label: CATEGORY_LABELS.beautyService,
    suggestion: "サービス内容が分かるように「美容院」や「散髪」のように入力してください。",
    intros: [
      "一度整うだけで、その後しばらく気分よく過ごせるなら十分意味があります。",
      "身だしなみを整える出費は、ただの贅沢では終わりません。",
      "見た目に納得できるだけで、余計な気疲れが減ります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、見た目を整えて気分まで軽くするためです。${intro} それなら、この出費はかなり自然です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は物が残らないぶん高く見えても、整ったあとの気分が続くなら十分ありです。${intro}`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、その場限りではなく、その後の過ごしやすさを買ったと思えば納得できます。${intro}`
    ]
  },
  healthFitness: {
    label: CATEGORY_LABELS.healthFitness,
    suggestion: "健康や運動の内容が分かるように「整体」や「ジムメンバーシップ」のように入力してください。",
    intros: [
      "体が楽になったり状態を把握しやすくなったりするなら、その時点で価値があります。",
      "調子を整えることにお金を使うのは、案外かなりまともです。",
      "無理を長引かせるより、先に整えた方が結果的に得なことは多いです。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、その場しのぎではなく自分の調子を整えるためです。${intro} 管理しやすくなる、続けやすくなる、そのどちらかでも十分意味があります。`,
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間続ける前提なら1日あたり約${perDay1Year}です。${intro} そのくらいで状態が整うなら、かなり安い方です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は高く見えても、体や生活が少しでも回りやすくなるなら意味があります。${intro} 結果的に得する出費です。`
    ]
  },
  homeDevice: {
    label: CATEGORY_LABELS.homeDevice,
    suggestion: "機器名が分かるように「AirPods Pro」や「洗濯機の交換部品」のように入力してください。",
    intros: [
      "毎日触る機器は、少し使いやすいだけで差が積み上がります。",
      "日々の小さな引っかかりが減るなら、その時点で意味があります。",
      "長く使う前提のものは、見た目より元が取りやすいです。"
    ],
    templates: [
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${intro} 毎日使うなら、そこまで高い話ではありません。`,
      ({ item, perDay3Years, intro }) =>
        `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${intro} 長く使うなら、十分納得できます。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、単なる物欲というより使い勝手を上げるためです。${intro} 生活が少しラクになるなら、いい買い物です。`
    ]
  },
  workTool: {
    label: CATEGORY_LABELS.workTool,
    suggestion: "仕事用途が分かるように「仕事用ノートPC」など具体的に入力してください。",
    intros: [
      "仕事で毎日触るものは、少しの差でも積み上がります。",
      "道具の引っかかりが減るだけで、作業のしんどさはかなり変わります。",
      "効率が上がるなら、その時点で十分理由になります。"
    ],
    templates: [
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${intro} 仕事が回りやすくなるなら、かなり堅い出費です。`,
      ({ item, perUse100, intro }) =>
        `${item}を100回使うと仮定すれば1回あたり${perUse100}です。${intro} 作業効率が上がるなら、必要な投資です。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、見た目より仕事のしんどさを減らすためです。${intro} それで生産性が上がるなら十分得しています。`
    ]
  },
  gameEntertainment: {
    label: CATEGORY_LABELS.gameEntertainment,
    suggestion: "娯楽内容が分かるように「PCゲーム」や「スマホゲーム課金」のように入力してください。",
    intros: [
      "ちゃんと楽しめるものがあるだけで、しんどい日の持ち方は変わります。",
      "趣味に使うお金は、気力を削り切らないための逃げ場でもあります。",
      "好きなものにちゃんと使えたなら、それだけで意味があります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、ただの遊び代というより気分を保つためです。${intro} ちゃんと楽しめるなら、この出費は十分ありです。`,
      ({ item, perUse100, intro }) =>
        `${item}を100回触れると仮定すれば1回あたり${perUse100}です。${intro} そのくらいで気力が持つなら悪くありません。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は趣味の出費ですが、好きなものがある方が日々は回しやすいです。${intro} それなら、無駄と切るほどではありません。`
    ]
  },
  event: {
    label: CATEGORY_LABELS.event,
    suggestion: "イベント内容が分かるように「映画チケット」や「美術館入場料」のように入力してください。",
    intros: [
      "体験に使うお金は、その場だけで終わるようで案外あとに残ります。",
      "見たものや感じたものが残るなら、それだけで十分意味があります。",
      "ちゃんと楽しめたなら、その日の出費としてかなり健全です。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、物を買うというより体験を取りにいった形です。${intro} それなら、かなり自然なお金の使い方です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は安くはなくても、見たあとに満足が残るなら十分ありです。${intro}`,
      ({ item, intro }) =>
        `${item}は形に残る買い物ではありませんが、ちゃんと楽しかったが残るなら成立しています。${intro}`
    ]
  },
  dailyGoods: {
    label: CATEGORY_LABELS.dailyGoods,
    suggestion: "日用品名が分かるように「ハンドソープ」など具体的に入力してください。",
    intros: [
      "日用品は派手ではなくても、切らすと普通に困ります。",
      "毎日の小さな快適さを支えるものには、それだけで意味があります。",
      "ちゃんと使うものなら、無理に贅沢扱いする話でもありません。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、生活を普通に回すためです。${intro} それなら、この出費はかなりまっとうです。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は地味でも、毎日使うなら十分理由があります。${intro}`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、贅沢ではなく日常の快適さを保つためです。${intro} ちゃんと使うなら問題ありません。`
    ]
  },
  timeSavingService: {
    label: CATEGORY_LABELS.timeSavingService,
    suggestion: "サービス内容が分かるように「家事代行」や「宿題代行サービス」のように入力してください。",
    intros: [
      "時間を買う出費は、疲れている時ほど意味が分かりやすいです。",
      "自分で抱えずに外へ出した分だけ、気力に余裕が戻ります。",
      "面倒をお金で減らすのは、かなり実用的な判断です。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、さぼりではなく時間と手間を買った形です。${intro} そのぶん他のことに回せるなら、十分得しています。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は安くはなくても、自分で抱える負担が減るなら意味があります。${intro} 楽になった時点で、この出費は成立しています。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、自分の気力をすり減らさないためです。${intro} 時短として効くなら、かなりまともです。`
    ]
  },
  sponsorship: {
    label: CATEGORY_LABELS.sponsorship,
    suggestion: "応援内容が分かるように「スポンサー枠」など具体的に入力してください。",
    intros: [
      "応援したいものにお金を使うなら、それだけで十分理由になります。",
      "物が残る買い方ではなくても、納得して払っているならそれでいいです。",
      "損得だけで見る種類の出費ではありません。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、物を買ったというより応援にお金を使った形です。${intro} 自分で納得しているなら、それで十分です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は実用品ではなくても、「応援したいから払う」で筋は通ります。${intro} 無理に損得へ落とし込まなくていい出費です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は形に残る買い物ではなくても、気持ちよく払えたなら成立しています。${intro}`
    ]
  },
  adultService: {
    label: "その他のサービス",
    suggestion: "内容が分かるように、もう少し具体的に入力してください。",
    intros: [
      "人には言いにくい出費でも、自分の中で区切りがつくなら意味はあります。",
      "胸を張って説明する類いではなくても、全部を無駄と切る話でもありません。",
      "気分が切り替わって引きずらなかったなら、それなりに役目は果たしています。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を使ったのは、人に説明しやすい出費ではありません。${intro} その場で切り替えができたなら、完全に無意味とも言い切れません。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は褒められる使い方ではなくても、自分の中で消化して終われるなら話は別です。${intro}`
    ]
  },
  gift: {
    label: CATEGORY_LABELS.gift,
    suggestion: "プレゼント内容が分かるように具体的に入力してください。",
    intros: [
      "誰かのために使うお金は、自分だけの損得では測りにくいです。",
      "喜んでもらえたなら、その時点でかなり意味があります。",
      "気持ちよく渡せたなら、それで十分成立しています。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、物そのものより気持ちを渡すためです。${intro} それなら、この出費はかなり自然です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は自分に残る買い物ではなくても、相手にちゃんと届くなら意味があります。${intro}`
    ]
  },
  subscription: {
    label: CATEGORY_LABELS.subscription,
    suggestion: "サブスク内容が分かるように具体的に入力してください。",
    intros: [
      "月額で気分か便利さを安定させるなら、それだけで価値があります。",
      "毎月少しずつ効くものは、派手ではなくても案外使い勝手がいいです。",
      "ちゃんと使っているなら、月額の意味は十分あります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、必要なときにすぐ使える状態を買っているからです。${intro} 続ける価値を感じているなら十分です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は積み上がると見えやすいですが、毎月ちゃんと使うなら無駄とは言えません。${intro}`
    ]
  },
  otherProduct: {
    label: CATEGORY_LABELS.otherProduct,
    suggestion: "商品名をもう少し具体的に入力してください。",
    intros: [
      "それを欲しいと思った時点で、ある程度は理由になっています。",
      "生活に支障が出ない範囲なら、すべての買い物に完璧な説明は要りません。",
      "使い道があるなら、値段だけで全部を切る話でもありません。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、それを欲しいと思った自分の判断を優先したからです。${intro}`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は理屈を盛りすぎなくても、納得して選んだならそれで十分です。${intro}`
    ]
  },
  otherService: {
    label: CATEGORY_LABELS.otherService,
    suggestion: "どんなサービスか分かるように、もう少し具体的に入力してください。",
    intros: [
      "サービスは物が残らなくても、楽になったなら意味があります。",
      "自分で抱えなくて済んだ時点で、価値はかなり分かりやすいです。",
      "使ったあとに少しでも負担が減るなら十分です。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、手間か気疲れを減らすためだと考えれば自然です。${intro} それで少しラクになるなら問題ありません。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は物が残らないぶん高く見えても、負担が減るなら意味があります。${intro}`
    ]
  }
};

const INTEGRITY_RULES = [
  {
    test: (category, text) => category !== "shoes" && /履く|履き/.test(text),
    reason: "靴以外に履く表現が入っています。"
  },
  {
    test: (category, text) => category !== "travelStay" && /宿泊/.test(text),
    reason: "旅行以外に宿泊表現が入っています。"
  },
  {
    test: (category, text) =>
      ["food", "dailyGoods", "beautyService", "timeSavingService", "transport", "event", "travelStay", "otherService"].includes(category) &&
      /100回|1年間|3年間/.test(text),
    reason: "単発や消耗寄りのものに耐用年数や回数計算が入っています。"
  },
  {
    test: (category, text) =>
      category !== "carMaintenance" && /故障|修理予防|トラブル防止/.test(text),
    reason: "整備以外に修理寄りの表現が入っています。"
  },
  {
    test: (category, text) =>
      category !== "workTool" && /仕事の効率|必要な投資です|生産性が上がるなら、必要な投資/.test(text),
    reason: "仕事用と断定する表現が混ざっています。"
  },
  {
    test: (category, text) => category !== "beautyProduct" && /毎日の身支度/.test(text),
    reason: "美容用品以外に身支度表現が入っています。"
  },
  {
    test: (category, text) =>
      category !== "transport" && category !== "premiumTransit" && category !== "travelStay" && /移動で|目的地/.test(text),
    reason: "移動系以外に交通表現が入っています。"
  }
];

function hasAny(text, terms) {
  return terms.some((term) => text.includes(term));
}

function toHalfWidth(value) {
  return value
    .replace(/[！-～]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, " ");
}

function normalizeItemName(value) {
  return toHalfWidth(value).trim().replace(/\s+/g, " ").toLowerCase();
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
  const normalizedItemName = normalizeItemName(rawItemName);
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
    rawItemName,
    displayItemName,
    normalizedItemName,
    amount
  };
}

function detectAmbiguity(normalizedItemName) {
  const directHint = AMBIGUOUS_INPUTS[normalizedItemName];

  if (directHint) {
    return directHint;
  }

  return "";
}

function detectCategory(normalizedItemName) {
  for (const rule of CATEGORY_RULES) {
    if (rule.match(normalizedItemName)) {
      return rule.name;
    }
  }

  if (normalizedItemName.endsWith("サービス")) {
    return "otherService";
  }

  return "otherProduct";
}

function buildTemplateData(itemName, amount) {
  return {
    item: itemName,
    formattedAmount: formatCurrency(amount),
    perUse100: calculatePerUse(amount, 100),
    perDay1Year: calculatePerDay(amount, 365),
    perDay3Years: calculatePerDay(amount, 365 * 3)
  };
}

function isValidGeneratedText(categoryName, text) {
  return INTEGRITY_RULES.every((rule) => !rule.test(categoryName, text));
}

function buildCandidates(categoryName, itemName, amount) {
  const definition = CATEGORY_DEFINITIONS[categoryName];
  const data = buildTemplateData(itemName, amount);
  const candidates = [];

  for (const intro of definition.intros) {
    for (const template of definition.templates) {
      const text = template({ ...data, intro });

      if (isValidGeneratedText(categoryName, text)) {
        candidates.push(text);
      }
    }
  }

  return candidates;
}

function generateExcuseText(itemName, normalizedItemName, amount) {
  const ambiguity = detectAmbiguity(normalizedItemName);

  if (ambiguity) {
    return {
      ok: false,
      message: `この商品・サービスに合う自然な言い訳を作れませんでした。${ambiguity}`
    };
  }

  const categoryName = detectCategory(normalizedItemName);
  const definition = CATEGORY_DEFINITIONS[categoryName];

  if (!definition) {
    return {
      ok: false,
      message: "この商品・サービスに合う自然な言い訳を作れませんでした。商品名をもう少し具体的に入力してください。"
    };
  }

  const candidates = buildCandidates(categoryName, itemName, amount);

  if (candidates.length === 0) {
    return {
      ok: false,
      message: `この商品・サービスに合う自然な言い訳を作れませんでした。${definition.suggestion}`
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
    categoryLabel: definition.label,
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
  detectCategory,
  generateExcuseText,
  normalizeItemName
};
