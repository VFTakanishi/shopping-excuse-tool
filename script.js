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
  premiumTransit: "交通・移動",
  travelStay: "旅行・宿泊",
  food: "食事",
  shoes: "靴",
  fashionWear: "ファッション",
  bag: "ファッション",
  fashionAccessory: "ファッション",
  beautyProduct: "美容用品",
  beautyService: "美容サービス",
  healthDevice: "健康用品・機器",
  healthApp: "健康用品・機器",
  healthService: "健康・美容サービス",
  healthSubscription: "健康・運動",
  medicalCare: "医療・身体のメンテナンス",
  insurance: "保険・備え",
  homeDevice: "家電・デジタル機器",
  homeRepair: "家電・デジタル機器の修理",
  workTool: "仕事道具",
  gameEntertainment: "ゲーム・娯楽",
  event: "映画・ライブ・イベント",
  dailyGoods: "日用品",
  timeSavingService: "家事代行・時短サービス",
  sponsorship: "スポンサー・応援・寄付",
  gift: "プレゼント",
  subscription: "サブスクリプション",
  fashionRepair: "ファッション用品の修理",
  genericRepair: "その他の修理",
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

const WORDS = {
  repair: ["修理", "整備", "点検", "交換", "オーバーホール", "oh", "メンテナンス", "調整", "補修", "リペア", "再塗装"],
  vehicle: [
    "車",
    "自動車",
    "バイク",
    "オートバイ",
    "エンジン",
    "ミッション",
    "タイヤ",
    "ブレーキ",
    "クラッチ",
    "タービン",
    "サスペンション",
    "車高調",
    "マフラー",
    "ホイール",
    "ラジエーター",
    "オルタネーター",
    "スターター",
    "デフ",
    "lsd",
    "ドライブシャフト",
    "ハブ",
    "車検",
    "ドラレコ"
  ],
  carCustom: ["車高調", "マフラー", "ホイール", "エアロ", "スポイラー", "サスペンション", "タービン"],
  homeDevice: [
    "洗濯機",
    "スマホ",
    "iphone",
    "ipad",
    "pc",
    "パソコン",
    "ノートpc",
    "macbook",
    "airpods",
    "イヤホン",
    "ヘッドホン",
    "エアコン",
    "冷蔵庫",
    "掃除機",
    "電子レンジ",
    "モニター",
    "ディスプレイ",
    "タブレット"
  ],
  fashionRepair: ["靴", "スニーカー", "ブーツ", "バッグ", "かばん", "鞄", "コート", "帽子", "腕時計", "時計", "服"],
  serviceWords: ["サービス", "代行", "レッスン", "相談", "施術", "診察", "検査"],
  recurringWords: ["月額", "月会費", "月謝", "メンバーシップ", "会費", "サブスク", "定期便", "オンラインフィットネス"],
  premiumTransit: ["グリーン車", "プレミアムシート", "ファーストクラス", "ビジネスクラス"],
  transport: ["タクシー", "駐車場代", "駐車料金", "駐車場", "ガソリン", "高速代", "交通費", "電車代", "バス代", "新幹線"],
  travelStay: ["旅行", "ホテル宿泊", "ホテル", "旅館", "宿泊", "温泉宿", "航空券", "ツアー"],
  event: ["映画チケット", "ライブチケット", "映画館", "美術館", "展覧会", "入場料", "観劇", "フェス", "コンサート", "舞台"],
  food: ["海鮮丼", "焼肉", "寿司", "ラーメン", "カフェ", "ランチ", "ディナー", "ごはん", "弁当", "丼", "定食", "うなぎ", "食事"],
  dailyGoods: ["ハンドソープ", "ボディソープ", "洗剤", "ティッシュ", "トイレットペーパー", "スポンジ"],
  timeSavingService: ["家事代行", "清掃代行", "洗濯代行", "宿題代行", "代行サービス"],
  beautyProduct: ["ヘアオイル", "美容液", "化粧水", "乳液", "コスメ", "日焼け止め", "スキンケア", "香水", "ヘアミルク"],
  beautyService: ["美容院", "ヘアサロン", "散髪", "カット", "カラー", "ネイル", "まつげ", "脱毛"],
  healthDevice: ["マッサージチェア", "体重計", "ヘルスメーター", "血圧計", "トレーニング器具", "ダンベル", "ヨガマット"],
  healthApp: ["ヘルスケアアプリ", "服薬管理アプリ", "ヘルスケア", "服薬管理", "健康管理アプリ"],
  healthService: ["整体", "マッサージ", "もみほぐし", "オイルマッサージ", "鍼灸"],
  healthSubscription: ["ジム月会費", "ジムメンバーシップ", "ジム", "パーソナルジム", "オンラインフィットネス", "ヨガ教室", "パーソナルトレーニング"],
  vehicleMaintenance: ["車検", "エンジンオイル交換", "エンジンオイル", "ミッションオイル", "オイル交換", "タイヤ交換", "ブレーキ点検"],
  medicalCare: ["医療費", "病院代", "診察代", "健康診断", "人間ドック", "歯医者", "歯科", "治療費", "薬代", "病院", "診察", "検査", "薬"],
  insurance: ["自動車保険", "医療保険", "火災保険", "生命保険", "損害保険", "任意保険", "保険料"],
  gameEntertainment: ["pcゲーム", "スマホゲーム", "ゲーム課金", "課金", "steam", "switch", "playstation", "xbox", "ゲーム", "漫画", "フィギュア", "アニメ", "プラモ", "小説"],
  sponsorship: ["スポンサー枠", "スポンサー", "支援", "投げ銭", "スパチャ", "fanbox", "patreon", "寄付"],
  workTool: ["仕事用ノートpc", "仕事用pc", "仕事用スマホ", "仕事用iphone", "業務用パソコン", "工具", "作業用工具"],
  shoes: ["スニーカー", "靴", "ブーツ", "ローファー", "パンプス", "サンダル"],
  bag: ["バッグ", "かばん", "鞄", "リュック", "トート", "ショルダー"],
  fashionAccessory: ["帽子", "腕時計", "時計", "アクセサリー", "ネックレス", "リング", "ピアス"],
  fashionWear: ["コート", "シャツ", "デニム", "パンツ", "ジャケット", "洋服", "服"],
  gift: ["プレゼント", "ギフト", "贈り物"],
  subscription: ["netflix", "spotify", "youtube premium"]
};

const CATEGORY_META = {
  carMaintenance: { kind: "product", serviceMode: "repair", repairDomain: "vehicle", suggestion: "整備内容が分かるように「車検」や「エンジン修理」のように入力してください。" },
  carCustom: { kind: "product", serviceMode: "purchase", suggestion: "カスタム内容が分かるように「車高調」や「マフラー」のように入力してください。" },
  transport: { kind: "service", serviceMode: "single", suggestion: "交通手段が分かるように「タクシー代」や「駐車場代」のように入力してください。" },
  premiumTransit: { kind: "service", serviceMode: "single", suggestion: "移動内容が分かるように「新幹線グリーン車」のように入力してください。" },
  travelStay: { kind: "service", serviceMode: "single", suggestion: "旅行内容が分かるように「ホテル宿泊」や「旅館」のように入力してください。" },
  food: { kind: "service", serviceMode: "single", suggestion: "食事内容が分かるように「海鮮丼」や「焼肉」のように入力してください。" },
  shoes: { kind: "product", serviceMode: "durable", suggestion: "靴の種類が分かるように「スニーカー」など具体的に入力してください。" },
  fashionWear: { kind: "product", serviceMode: "durable", suggestion: "服の種類が分かるように「コート」など具体的に入力してください." },
  bag: { kind: "product", serviceMode: "durable", suggestion: "バッグの種類が分かるように具体的に入力してください。" },
  fashionAccessory: { kind: "product", serviceMode: "durable", suggestion: "帽子や腕時計など、具体的な品名を入力してください。" },
  beautyProduct: { kind: "product", serviceMode: "consumable", suggestion: "美容用品名が分かるように「ヘアオイル」など具体的に入力してください。" },
  beautyService: { kind: "service", serviceMode: "single", suggestion: "サービス内容が分かるように「美容院」や「散髪」のように入力してください。" },
  healthDevice: { kind: "product", serviceMode: "durable", suggestion: "健康用品名が分かるように「体重計」など具体的に入力してください。" },
  healthApp: { kind: "product", serviceMode: "durable", suggestion: "アプリ名が分かるように「ヘルスケアアプリ」など具体的に入力してください。" },
  healthService: { kind: "service", serviceMode: "single", suggestion: "サービス内容が分かるように「整体」や「健康診断」のように入力してください。" },
  healthSubscription: { kind: "service", serviceMode: "recurring", suggestion: "継続サービス名が分かるように「ジム月会費」など具体的に入力してください。" },
  medicalCare: { kind: "service", serviceMode: "single", suggestion: "医療内容が分かるように具体的に入力してください。" },
  insurance: { kind: "service", serviceMode: "recurring", suggestion: "保険の種類が分かるように具体的に入力してください。" },
  homeDevice: { kind: "product", serviceMode: "durable", suggestion: "機器名が分かるように具体的に入力してください。" },
  homeRepair: { kind: "service", serviceMode: "repair", repairDomain: "homeDevice", suggestion: "修理対象が分かるように「スマホ修理」や「洗濯機修理」のように入力してください。" },
  workTool: { kind: "product", serviceMode: "durable", suggestion: "仕事用途が分かるように「仕事用ノートPC」など具体的に入力してください。" },
  gameEntertainment: { kind: "product", serviceMode: "entertainment", suggestion: "娯楽内容が分かるように「PCゲーム」や「スマホゲーム課金」のように入力してください。" },
  event: { kind: "service", serviceMode: "single", suggestion: "イベント内容が分かるように「映画チケット」など具体的に入力してください。" },
  dailyGoods: { kind: "product", serviceMode: "consumable", suggestion: "日用品名が分かるように具体的に入力してください。" },
  timeSavingService: { kind: "service", serviceMode: "single", suggestion: "サービス内容が分かるように「家事代行」など具体的に入力してください。" },
  sponsorship: { kind: "service", serviceMode: "support", suggestion: "応援内容が分かるように「スポンサー枠」など具体的に入力してください。" },
  gift: { kind: "product", serviceMode: "generic", suggestion: "プレゼント内容が分かるように具体的に入力してください。" },
  subscription: { kind: "service", serviceMode: "recurring", suggestion: "サブスク内容が分かるように具体的に入力してください。" },
  fashionRepair: { kind: "service", serviceMode: "repair", repairDomain: "fashion", suggestion: "修理対象が分かるように「靴修理」や「バッグ修理」のように入力してください。" },
  genericRepair: { kind: "service", serviceMode: "repair", repairDomain: "generic", suggestion: "修理対象が分かるように、もう少し具体的に入力してください。" },
  otherProduct: { kind: "product", serviceMode: "generic", suggestion: "商品名をもう少し具体的に入力してください。" },
  otherService: { kind: "service", serviceMode: "single", suggestion: "どんなサービスか分かるように、もう少し具体的に入力してください。" }
};

const CATEGORY_DEFINITIONS = {
  carMaintenance: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、贅沢ではなく普通に走れる状態を保つためです。安全性や信頼性を維持できるなら、この出費は必要経費です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は軽い話ではありませんが、故障の悪化を防いで安心して走れる状態へ戻すなら十分意味があります。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、移動できない状態を避けるためだと思えば自然です。ちゃんと使える状態に戻るなら、払う意味はあります。`
    ]
  },
  carCustom: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、壊れたからではなく乗る楽しさや見た目の満足を上げるためです。好きで手を入れたと思えるなら、十分納得できます。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は趣味の出費ですが、そのぶん満足は分かりやすいです。見た目や走りが自分の好みに寄るなら悪くありません。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、必要最低限ではなく自分の好みに寄せるためです。そこに価値を感じているなら十分ありです。`
    ]
  },
  transport: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、単なる出費というより移動を成立させるためです。時間か体力のどちらかを守れているなら十分意味があります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は地味でも、移動をスムーズにするためのお金です。その日の手間や疲れが減るなら、普通にありです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、その日の移動を楽に回すためです。ちゃんと着けている時点で役に立っています。`
    ]
  },
  premiumTransit: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、贅沢というより移動で疲れないためです。目的地でちゃんと動けるなら、結果的に得しています。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は高く見えても、移動でぐったりしないだけで意味があります。その後の動きやすさまで含めれば、必要な経費です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を足したのは、席の違いというより体力を残すためです。移動で潰れないなら、そのぶんは十分回収できます。`
    ]
  },
  travelStay: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、移動や宿代そのものより、その時間をちゃんと取ったという話です。気分が切り替わったなら、ただ消えたお金ではありません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は安い話ではなくても、ちゃんと休めたとか行ってよかったが残るなら十分ありです。`,
      ({ item }) =>
        `${item}は物が残る買い物ではありませんが、その日の満足や思い出が残るなら成立しています。`
    ]
  },
  food: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、ただ食べるためではなく、ちゃんと満足するためです。食べてよかったが残るなら、この出費は普通に成立しています。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は安いとは言いませんが、満足できたなら高すぎるとも言えません。妥協して物足りなさが残るより、ずっとましです。`,
      ({ item }) =>
        `${item}は一食として見ると強めでも、ちゃんと気分まで上がったなら意味があります。`
    ]
  },
  shoes: {
    templates: [
      ({ item, perUse100 }) =>
        `${item}を100回履くと仮定すれば1回あたり${perUse100}です。よく履く一足なら、けして高すぎる買い物ではありません。`,
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。履きやすくて出番が多いなら、普通に元は取れます。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、勢いだけではなく出番があるからです。よく履くなら、その金額はちゃんと回収できます。`
    ]
  },
  fashionWear: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。普段使いする回数が多いなら、その金額は十分ありです。`,
      ({ item, perDay3Years }) =>
        `3年間使えれば、${item}は1日あたり約${perDay3Years}です。長く身につける前提なら、かなり落ち着いた買い方です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、見た目だけではなく出番を見込んでいるからです。コーディネートに取り入れやすいなら十分納得できます。`
    ]
  },
  bag: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。普段使いしやすくて出番が多いなら、十分元は取れます。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、見た目だけではなく使いやすさ込みです。持ち歩くたびに気分が上がるなら悪くありません。`,
      ({ item, perUse100 }) =>
        `${item}を100回使うと仮定すれば1回あたり${perUse100}です。荷物がまとまって毎回これで済むなら、そこまで高い話ではありません。`
    ]
  },
  fashionAccessory: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。身につけるたびに気分が上がるなら十分ありです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、普段のコーディネートに取り入れやすいからです。出番が多いなら、その金額にも納得できます。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は強く見えても、普段使いして満足が積み上がるなら意味があります。`
    ]
  },
  beautyProduct: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。毎日の身支度が少しラクになるなら、十分ありです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、贅沢というより自分を整えるためです。使うたびに気分が整うなら悪くありません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は派手に見えても、日常の満足度を上げるなら意味があります。`
    ]
  },
  beautyService: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、見た目を整えて気分まで軽くするためです。整ったあとの過ごしやすさまで含めれば自然な出費です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は物が残らないぶん高く見えても、身だしなみに納得できるなら十分ありです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、その場限りではなく、その後の過ごしやすさを買ったと思えば納得できます。`
    ]
  },
  healthDevice: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。自宅で繰り返し使えて日常的な身体管理に回せるなら十分ありです。`,
      ({ item, perDay3Years }) =>
        `3年間使えれば、${item}は1日あたり約${perDay3Years}です。自分の状態を見たり整えたりする道具なら、長い目で見て納得できます。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、体の管理を後回しにしないためです。自宅で使えて繰り返し役立つなら悪くありません。`
    ]
  },
  healthApp: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、自分の状態を把握しやすくして管理を続けやすくするためです。ちゃんと使うなら、かなり実用的な出費です。`,
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。記録や管理を習慣化しやすくなるなら、その金額は十分ありです。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は派手ではなくても、体調や服薬の管理が楽になるなら意味があります。`
    ]
  },
  healthService: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、その場しのぎではなく身体や見た目の状態を整えるためです。不調や違和感を放置しないなら、この出費は十分自然です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は物が残らなくても、状態が整ってラクになるなら意味があります。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、一度の施術やケアで今の状態を立て直すためです。そのあと過ごしやすくなるなら十分ありです。`
    ]
  },
  healthSubscription: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、運動やケアを続ける環境を確保するためです。月額で機会を作って習慣化しやすくなるなら、かなり意味があります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は単発ではなく、続ける前提の出費です。サボりにくい環境を買っていると思えば自然です。`,
      ({ item, perDay1Year }) =>
        `${item}を1年間続ける前提なら1日あたり約${perDay1Year}です。そのくらいで運動の機会を作れるなら、案外安い方です。`
    ]
  },
  medicalCare: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、不調を放置しないためです。状態を確認したり整えたりして、将来の大きな負担を避けるなら十分意味があります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は楽しい出費ではありませんが、身体を維持するためのお金だと思えばかなりまっとうです。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、今ある違和感や不安をそのままにしないためです。早めに手を打てるなら悪くありません。`
    ]
  },
  insurance: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、使うためというより万一の負担の上限を決めるためです。大きな損失をそのまま受けないための費用だと思えば自然です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は目に見える満足を買う出費ではありませんが、備えとしてはかなり筋が通っています。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、安心を買うというより、もしものときのダメージを小さくするためです。`
    ]
  },
  homeDevice: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。毎日触るものなら、そこまで高い話ではありません。`,
      ({ item, perDay3Years }) =>
        `3年間使えれば、${item}は1日あたり約${perDay3Years}です。長く使うなら十分納得できます。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、単なる物欲というより使い勝手を上げるためです。生活が少しラクになるなら、いい買い物です。`
    ]
  },
  homeRepair: {
    templates: [
      ({ item, formattedAmount, repairContext }) =>
        `${item}に${formattedAmount}を払ったのは、買い替えずに使い続けられる状態へ戻すためです。${repairContext.digital ? "必要な機能やデータ環境を守れるなら" : "生活上の不便を解消できるなら"}、十分意味があります。`,
      ({ item, formattedAmount, repairContext }) =>
        `${formattedAmount}の${item}は軽い話ではありませんが、${repairContext.digital ? "機能や環境を維持できるなら" : "必要な機能を回復できるなら"}、新しく買い直す前に選ぶ理由としてはかなり自然です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、壊れたまま不便を抱えるより、今あるものを使い続けるためです。`
    ]
  },
  workTool: {
    templates: [
      ({ item, perDay1Year }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。仕事が回りやすくなるなら、かなり堅い出費です。`,
      ({ item, perUse100 }) =>
        `${item}を100回使うと仮定すれば1回あたり${perUse100}です。作業効率が上がるなら、必要な投資です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、見た目より仕事のしんどさを減らすためです。それで生産性が上がるなら十分得しています。`
    ]
  },
  gameEntertainment: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、ただの遊び代というより気分を保つためです。ちゃんと楽しめるなら、この出費は十分ありです。`,
      ({ item, perUse100 }) =>
        `${item}を100回触れると仮定すれば1回あたり${perUse100}です。そのくらいで気力が持つなら悪くありません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は趣味の出費ですが、好きなものがある方が日々は回しやすいです。それなら、無駄と切るほどではありません。`
    ]
  },
  event: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、物を買うというより体験を取りにいった形です。見たものや感じたものが残るなら、かなり自然なお金の使い方です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は安くはなくても、見たあとに満足が残るなら十分ありです。`,
      ({ item }) =>
        `${item}は形に残る買い物ではありませんが、ちゃんと楽しかったが残るなら成立しています。`
    ]
  },
  dailyGoods: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、生活を普通に回すためです。派手ではなくても、毎日使うなら十分理由があります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は地味でも、切らすと普通に困る種類の出費です。だからこそ、ちゃんと使うなら問題ありません。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、贅沢ではなく日常の快適さを保つためです。`
    ]
  },
  timeSavingService: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、さぼりではなく時間と手間を買った形です。そのぶん他のことに回せるなら、十分得しています。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は安くはなくても、自分で抱える負担が減るなら意味があります。楽になった時点で、この出費は成立しています。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、自分の気力をすり減らさないためです。時短として効くなら、かなりまともです。`
    ]
  },
  sponsorship: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、物を買ったというより応援にお金を使った形です。自分で納得しているなら、それで十分です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は実用品ではなくても、「応援したいから払う」で筋は通ります。無理に損得へ落とし込まなくていい出費です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は形に残る買い物ではなくても、気持ちよく払えたなら成立しています。`
    ]
  },
  gift: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、物そのものより気持ちを渡すためです。喜んでもらえたなら、その時点でかなり意味があります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は自分に残る買い物ではなくても、相手にちゃんと届くなら意味があります。`
    ]
  },
  subscription: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、必要なときにすぐ使える状態を買っているからです。続ける価値を感じているなら十分です。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は積み上がると見えやすいですが、毎月ちゃんと使うなら無駄とは言えません。`
    ]
  },
  fashionRepair: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、気に入った物を買い替えずに使い続けるためです。傷みを直して寿命を延ばせるなら十分意味があります。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は新しく買う出費ではなく、今ある物をちゃんと使い続けるためのお金です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、まだ使いたい物を手放さずに済ませるためです。納得して使い続けられるなら悪くありません。`
    ]
  },
  genericRepair: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、新しく買い直す前に、今ある物を使い続けられる状態へ戻すためです。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は軽い話ではなくても、まだ使えるものを活かすための出費だと思えば自然です。`,
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を出したのは、壊れたまま我慢するより、今ある物を整えて使うためです。`
    ]
  },
  otherProduct: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、それを欲しいと思った自分の判断を優先したからです。生活に支障が出ない範囲なら、完璧な理屈は要りません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は理屈を盛りすぎなくても、納得して選んだならそれで十分です。`
    ]
  },
  otherService: {
    templates: [
      ({ item, formattedAmount }) =>
        `${item}に${formattedAmount}を払ったのは、手間か気疲れを減らすためだと考えれば自然です。少しでもラクになるなら問題ありません。`,
      ({ item, formattedAmount }) =>
        `${formattedAmount}の${item}は物が残らないぶん高く見えても、負担が減るなら意味があります。`
    ]
  }
};

const VALIDATION_RULES = [
  {
    test: (context, text) => context.categoryName !== "shoes" && /履く|履き/.test(text),
    reason: "靴以外に履く表現が入っています。"
  },
  {
    test: (context, text) => context.categoryName !== "fashionWear" && /着る|着やす/.test(text),
    reason: "服以外に着る表現が入っています。"
  },
  {
    test: (context, text) => context.categoryName !== "bag" && /持ち歩く/.test(text),
    reason: "バッグ以外に持ち歩く表現が入っています。"
  },
  {
    test: (context, text) => !["carMaintenance", "carCustom"].includes(context.categoryName) && /走れる|乗れる|乗るたび|運転|車検|走行|ドライブ/.test(text),
    reason: "車以外に車専用語が入っています。"
  },
  {
    test: (context, text) => context.repairContext.isRepair && /壊れたからではなく|修理とは別|見た目を変えるためだけ|新しく欲しかったから/.test(text),
    reason: "修理文脈に購入向けの表現が入っています。"
  },
  {
    test: (context, text) => ["healthService", "beautyService", "medicalCare", "timeSavingService", "transport", "premiumTransit", "travelStay", "event", "otherService", "homeRepair", "fashionRepair", "genericRepair", "carMaintenance"].includes(context.categoryName) && /1年間使う|3年間使う|100回使う|所有する|手元に残る/.test(text),
    reason: "単発サービスや修理に耐用年数表現が入っています。"
  },
  {
    test: (context, text) => ["shoes", "fashionWear", "bag", "fashionAccessory", "beautyProduct", "healthDevice", "homeDevice", "workTool", "otherProduct", "dailyGoods", "gift"].includes(context.categoryName) && /通い続ける|施術を受ける|診察を受ける|月会費/.test(text),
    reason: "商品にサービス向けの表現が入っています。"
  },
  {
    test: (context, text) => context.categoryName !== "travelStay" && /宿泊/.test(text),
    reason: "旅行以外に宿泊表現が入っています。"
  },
  {
    test: (context, text) => context.categoryName !== "beautyProduct" && /毎日の身支度/.test(text),
    reason: "美容用品以外に身支度表現が入っています。"
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

function normalizeInput(value) {
  return toHalfWidth(value).trim().replace(/\s+/g, " ").toLowerCase();
}

function detectAmbiguousInput(normalizedItemName) {
  return AMBIGUOUS_INPUTS[normalizedItemName] || "";
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

function detectRepairContext(normalizedItemName) {
  const isRepair = hasAny(normalizedItemName, WORDS.repair);
  const hasVehicleWord = hasAny(normalizedItemName, WORDS.vehicle);
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
    domain,
    digital: hasAny(normalizedItemName, ["スマホ", "iphone", "ipad", "pc", "パソコン", "ノートpc", "macbook", "airpods"])
  };
}

function detectItemType(normalizedItemName, repairContext) {
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

  if (hasAny(normalizedItemName, WORDS.medicalCare)) {
    return { categoryName: "medicalCare" };
  }

  if (hasAny(normalizedItemName, WORDS.vehicleMaintenance)) {
    return { categoryName: "carMaintenance" };
  }

  if (hasAny(normalizedItemName, WORDS.sponsorship)) {
    return { categoryName: "sponsorship" };
  }

  if (hasAny(normalizedItemName, WORDS.premiumTransit)) {
    return { categoryName: "premiumTransit" };
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

  if (hasAny(normalizedItemName, WORDS.healthDevice)) {
    return { categoryName: "healthDevice" };
  }

  if (hasAny(normalizedItemName, WORDS.healthApp)) {
    return { categoryName: "healthApp" };
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

  if (hasAny(normalizedItemName, WORDS.dailyGoods)) {
    return { categoryName: "dailyGoods" };
  }

  if (hasAny(normalizedItemName, WORDS.food)) {
    return { categoryName: "food" };
  }

  if (hasAny(normalizedItemName, WORDS.gameEntertainment)) {
    return { categoryName: "gameEntertainment" };
  }

  if (hasAny(normalizedItemName, WORDS.workTool)) {
    return { categoryName: "workTool" };
  }

  if (hasAny(normalizedItemName, WORDS.homeDevice)) {
    return { categoryName: "homeDevice" };
  }

  if (hasAny(normalizedItemName, WORDS.carCustom)) {
    return { categoryName: "carCustom" };
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

  if (hasAny(normalizedItemName, WORDS.subscription)) {
    return { categoryName: "subscription" };
  }

  if (hasAny(normalizedItemName, WORDS.serviceWords) || hasAny(normalizedItemName, WORDS.recurringWords)) {
    return { categoryName: "otherService" };
  }

  return { categoryName: "otherProduct" };
}

function detectCategory(normalizedItemName, repairContext) {
  return detectItemType(normalizedItemName, repairContext).categoryName;
}

function buildTemplateData(itemName, amount, repairContext) {
  return {
    item: itemName,
    formattedAmount: formatCurrency(amount),
    perUse100: calculatePerUse(amount, 100),
    perDay1Year: calculatePerDay(amount, 365),
    perDay3Years: calculatePerDay(amount, 365 * 3),
    repairContext
  };
}

function getCompatibleTemplates(categoryName) {
  const definition = CATEGORY_DEFINITIONS[categoryName];
  return definition ? definition.templates : [];
}

function validateGeneratedText(context, text) {
  return VALIDATION_RULES.every((rule) => !rule.test(context, text));
}

function buildCandidates(context) {
  const templates = getCompatibleTemplates(context.categoryName);
  const data = buildTemplateData(context.itemName, context.amount, context.repairContext);
  const candidates = [];

  for (const template of templates) {
    const text = template(data);
    if (validateGeneratedText(context, text)) {
      candidates.push(text);
    }
  }

  return candidates;
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
      message: `この商品・サービスに合う自然な言い訳を作れませんでした。${ambiguousHint}`
    };
  }

  const repairContext = detectRepairContext(normalizedItemName);
  const categoryName = detectCategory(normalizedItemName, repairContext);
  const meta = CATEGORY_META[categoryName];

  if (!meta) {
    return {
      ok: false,
      message: "この商品・サービスに合う自然な言い訳を作れませんでした。商品名をもう少し具体的に入力してください。"
    };
  }

  const context = {
    itemName,
    normalizedItemName,
    amount,
    categoryName,
    repairContext,
    meta
  };

  const candidates = buildCandidates(context);
  if (candidates.length === 0) {
    return {
      ok: false,
      message: `この商品・サービスに合う自然な言い訳を作れませんでした。${meta.suggestion}`
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
  detectItemType,
  detectCategory,
  detectRepairContext,
  getCompatibleTemplates,
  generateExcuseText,
  validateGeneratedText
};
