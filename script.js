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

let lastExcuse = "";
let copyTimerId = null;

const recentExcusesByKey = new Map();

const categoryConfigs = [
  {
    name: "bag",
    keywords: ["バッグ", "かばん", "鞄", "リュック", "トート", "ショルダー", "ボディバッグ"],
    intros: [
      "バッグは毎回持つものなので、使いやすさがそのまま満足度に出ます。",
      "荷物がまとまるバッグは、それだけで出かけるときの面倒が減ります。",
      "服に合わせやすいバッグは、結局いちばん出番が多くなります。",
      "毎回これでいいと思えるバッグなら、値段だけでは決めにくいです。"
    ],
    templates: [
      ({ item, perUse100, intro }) =>
        `${item}を100回使うと仮定すれば1回あたり${perUse100}です。${intro} 毎回これで済むなら、そこまで高い話ではありません。`,
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間しっかり使う前提なら1日あたり約${perDay1Year}です。${intro} 出番が多いなら、十分元は取れます。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、見た目だけではなく使いやすさ込みです。${intro} 荷物がまとまって、服にも合わせやすいなら納得できます。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}でも、毎回持つことを考えれば高いだけではありません。${intro} 安いものを何となく買い替えるより、気に入ったものを使う方が話は早いです。`
    ]
  },
  {
    name: "fashion",
    keywords: ["靴", "スニーカー", "ブーツ", "ローファー", "服", "コート", "シャツ", "デニム", "パンツ", "ジャケット", "帽子"],
    intros: [
      "よく使う一着や一足なら、値段だけで雑に高いとは言い切れません。",
      "気に入っている服や靴があるだけで、出かける気分はかなり変わります。",
      "合わせやすいものは結局いちばん出番が多くなります。",
      "ちゃんと使う前提なら、着るたび履くたびに回収していけます。"
    ],
    templates: [
      ({ item, perUse100, intro }) =>
        `${item}を100回使うと仮定すれば1回あたり${perUse100}です。${intro} それだけ出番があるなら、けして無茶な買い物ではありません。`,
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${intro} 毎回ちゃんと着るなら、普通に元は取れます。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、勢いだけではなく使う理由があるからです。${intro} よく使うなら、その金額はちゃんと薄まっていきます。`,
      ({ item, perDay3Years, intro }) =>
        `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${intro} 長く付き合えるなら、むしろ落ち着いた買い方です。`
    ]
  },
  {
    name: "work",
    keywords: ["工具", "パソコン", "pc", "ノートpc", "スマホ", "iphone", "ipad", "キーボード", "マウス", "モニター", "ディスプレイ"],
    intros: [
      "仕事道具は、使いやすいだけで毎日のしんどさがかなり変わります。",
      "毎回引っかかるところを減らせるなら、その時点で価値があります。",
      "作業で毎日触るものは、差が少しでも積み上がります。",
      "道具が合うと、余計な疲れ方をしなくて済みます。"
    ],
    templates: [
      ({ item, perUse100, intro }) =>
        `${item}を100回使うと仮定すれば1回あたり${perUse100}です。${intro} 一回ごとの作業が少しでもラクになるなら、十分回収できます。`,
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${intro} それで作業効率が上がるなら、結果的に得です。`,
      ({ item, perDay3Years, intro }) =>
        `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${intro} 毎日使うものなら、思ったより安くつきます。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払うのは高く見えても、仕事の引っかかりを減らせるなら意味があります。${intro} 生産性が上がるなら、必要な投資です。`
    ]
  },
  {
    name: "food",
    keywords: ["食事", "焼肉", "寿司", "ラーメン", "カフェ", "ランチ", "ディナー", "ごはん", "弁当", "丼", "海鮮丼", "定食", "うなぎ"],
    intros: [
      "ちゃんと満足できるごはんは、その日の気分まで変えます。",
      "食事は空腹を埋めるだけじゃなくて、気分を立て直す役目もあります。",
      "食べて満足できたなら、その時点で意味はあります。",
      "おいしいものを食べた日は、そのあと少し機嫌よく過ごせます。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、ただ食べるためというより、ちゃんと満足するためです。${intro} 食べて気分まで上がったなら、それで十分です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は安いとは言いませんが、満足できたなら高すぎるとも言えません。${intro} 変に妥協して物足りなさが残るより、ずっとましです。`,
      ({ item, intro }) =>
        `${item}は一食として見ると高めでも、ちゃんと「食べてよかった」が残るなら成立しています。${intro} ただ高いだけの出費ではありません。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}でも、食べたいものをちゃんと食べたなら十分ありです。${intro} 気分まで戻ったなら、むしろいい使い方です。`
    ]
  },
  {
    name: "fun",
    keywords: ["ゲーム", "漫画", "フィギュア", "アニメ", "プラモ", "小説", "dvd", "blu-ray", "ライブグッズ"],
    intros: [
      "好きなものがあるだけで、しんどい週の持ち方が変わります。",
      "趣味は贅沢というより、気力を削り切らないための逃げ場です。",
      "ちゃんと楽しめるものにお金を使う日はあっていいです。",
      "何も楽しみがない状態より、よほど健全です。"
    ],
    templates: [
      ({ item, perUse100, intro }) =>
        `${item}を100回触れると仮定すれば1回あたり${perUse100}です。${intro} それで気分が持つなら、十分安い方です。`,
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間の中で何度も楽しむ前提なら、1日あたり約${perDay1Year}です。${intro} そのくらいで気力が保てるなら悪くありません。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、ただの趣味代というより、気分を保つための出費です。${intro} ちゃんと楽しめるなら、十分意味があります。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は冷静に見ると趣味の出費ですが、好きなものがある方が日々は回しやすいです。${intro} それなら、このお金は無駄ではありません。`
    ]
  },
  {
    name: "adultService",
    keywords: ["風俗", "ソープ", "ヘルス", "デリヘル", "ピンサロ", "ホテヘル"],
    intros: [
      "人には言いにくい出費でも、自分の中で区切りがつくなら意味はあります。",
      "こういうお金は胸を張って言う類いではなくても、雑に全部無駄とは言えません。",
      "気分が切り替わって引きずらなかったなら、それなりに役目は果たしています。",
      "息抜きとして処理できているなら、単なる散財で終わる話でもありません。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を使ったのは、人に説明しやすい出費ではありません。${intro} その場で切り替えができたなら、完全に無意味とも言い切れません。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は褒められる使い方ではなくても、自分の中で消化して終われるなら話は別です。${intro} ずるずる引きずるよりはましです。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、きれいな言い方はしにくくても、気分の整理代と考えればまだ筋は通ります。${intro}`
    ]
  },
  {
    name: "sponsorship",
    keywords: ["スポンサー", "スポンサー枠", "支援", "投げ銭", "スパチャ", "fanbox", "patreon", "メンバーシップ"],
    intros: [
      "応援したいものにお金を使うなら、それだけで十分理由になります。",
      "物が残る買い方ではなくても、納得して払っているならそれでいいです。",
      "好きで支えているものに使ったお金なら、無駄と決めつける話でもありません。",
      "損得だけで見る種類の出費ではありません。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、物を買ったというより応援にお金を使った形です。${intro} 自分が納得しているなら、それで十分です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は実用品ではなくても、「応援したいから払う」でちゃんと筋が通ります。${intro} 無理に損得へ落とし込まなくていい出費です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は形に残る買い物ではなくても、気持ちよく払えたならそれで成立しています。${intro}`
    ]
  },
  {
    name: "premiumTransit",
    keywords: ["グリーン車", "プレミアムシート", "アップグレード席", "ファーストクラス", "ビジネスクラス"],
    intros: [
      "移動で疲れすぎないことにお金を使うのは、思ったよりちゃんと意味があります。",
      "目的地に着いた時点でぐったりしていないだけで、かなり違います。",
      "座れる、静か、ラク、その差でその後の動きやすさは変わります。",
      "移動を少しラクにする出費は、贅沢というより消耗を減らすためのものです。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、贅沢というより移動で疲れないためです。${intro} 目的地でちゃんと動けるなら、結果的に得しています。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は高く見えても、移動でぐったりしないだけで意味があります。${intro} その後の生産性まで含めれば、必要な経費です。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を足したのは、席の違いというより体力を残すためです。${intro} 移動で潰れないなら、そのぶんは回収できます。`
    ]
  },
  {
    name: "personalService",
    keywords: ["整体", "マッサージ", "エステ", "もみほぐし", "リラク", "クリーニング", "パーソナル", "ジム", "サウナ"],
    intros: [
      "体がラクになる出費は、物が残らなくても十分元を取りにいけます。",
      "体の重さやだるさが減るなら、その時点でかなり意味があります。",
      "自分の調子が戻るなら、サービス代というより必要経費に近いです。",
      "整ったあとにちゃんと動けるなら、それだけで価値があります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、その場しのぎではなく体をちゃんと戻すためです。${intro} 体が整って楽になって、生産性が上がるなら結果的に得しています。`,
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間の中で何度か使う前提なら、1日あたり約${perDay1Year}です。${intro} その後にちゃんと動けるなら、普通に元は取れます。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は物が残らないぶん高く見えても、体が軽くなって仕事や生活が回りやすくなるなら高くありません。${intro} むしろ先に整えた方が得です。`
    ]
  },
  {
    name: "travel",
    keywords: ["旅行", "ホテル", "旅館", "宿", "宿泊", "温泉宿", "チケット", "航空券", "新幹線", "ツアー"],
    intros: [
      "旅行や宿は、その場だけで終わるお金ではありません。",
      "行けるときに行っておく方が、あとで後悔しにくいです。",
      "ちゃんと休めた日や出かけた日の満足は、思ったより長く残ります。",
      "今しかないタイミングにお金を使うのは、案外まっとうです。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、移動や宿泊そのものより、今行ける機会を押さえたと考えると自然です。${intro} 行かなかった後悔を避けられるなら、十分ありです。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は安くはなくても、ちゃんと休めた、行ってよかったと思えたなら意味があります。${intro} それなら、ただ消えたお金ではありません。`,
      ({ item, intro }) =>
        `${item}は目に見える物が残る出費ではなくても、行った満足や思い出はちゃんと残ります。${intro} そう思えるなら、この出費は成立しています。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、贅沢というよりその日の体験を取りにいった形です。${intro} ちゃんと気分が切り替わったなら、十分意味があります。`
    ]
  },
  {
    name: "beauty",
    keywords: ["美容", "化粧品", "コスメ", "美容液", "日焼け止め", "スキンケア", "香水"],
    intros: [
      "美容まわりは見た目だけじゃなくて、気分にも効きます。",
      "ちゃんと整っているだけで、余計な気疲れが減ります。",
      "自分の見た目に納得できる日は、それだけで少しラクです。",
      "毎日の身支度がスムーズになるなら、十分意味があります。"
    ],
    templates: [
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${intro} そのくらいで気分よく過ごせるなら、けっこう安い方です。`,
      ({ item, perDay3Years, intro }) =>
        `3年間のうち使える期間をならして考えると、${item}は1日あたり約${perDay3Years}です。${intro} 長い目で見れば、十分納得できます。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を使うのは贅沢に見えても、毎回の身支度を少しラクにする装備だと思えば自然です。${intro} ちゃんと整うなら、その価値はあります。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は派手に見えても、見た目と気分の両方を整える道具です。${intro} そのおかげで一日を楽に始められるなら、悪くありません。`
    ]
  },
  {
    name: "home",
    keywords: ["家電", "家具", "掃除機", "冷蔵庫", "椅子", "デスク", "照明", "電子レンジ"],
    intros: [
      "家で使うものは、地味でも毎日効きます。",
      "家の中の面倒が一つ減るだけで、かなりラクになります。",
      "毎日触るものなら、使いやすさにお金をかける意味はあります。",
      "生活のしんどさを減らす買い物は、派手じゃなくても大事です。"
    ],
    templates: [
      ({ item, perUse100, intro }) =>
        `${item}を100回使うと仮定すれば1回あたり${perUse100}です。${intro} 家の中で何度も使うなら、思ったより回収は早いです。`,
      ({ item, perDay3Years, intro }) =>
        `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${intro} 毎日の小さな面倒が減るなら、十分元は取れます。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、部屋の見た目より生活の引っかかりを減らすためです。${intro} 毎日少しラクになるなら、いい買い物です。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}はその日だけ見ると高くても、日々の面倒を肩代わりしてくれるなら意味があります。${intro} 生活コストを下げる買い物だと思えば自然です。`
    ]
  },
  {
    name: "vehicle",
    keywords: ["自動車", "車", "バイク", "タイヤ", "ヘルメット", "部品", "オイル", "ドラレコ"],
    intros: [
      "車やバイクまわりは、ちゃんと使える状態を保つだけで十分意味があります。",
      "移動手段にお金をかけるのは、趣味だけの話ではありません。",
      "安全に乗れて普通に使えるなら、その出費には理由があります。",
      "日常で使う乗り物なら、安心して動けること自体に価値があります。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、高く見えてもちゃんと使える状態を保つためです。${intro} 安心して乗れるなら、その時点で意味があります。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は軽い出費ではありませんが、移動の足が安定するなら納得できます。${intro} 日常で普通に使えること自体が十分価値です。`,
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を払ったのは、贅沢というより安全に使うための出費です。${intro} ちゃんと乗れて不安が減るなら、それで十分です。`
    ]
  },
  {
    name: "generic",
    keywords: [],
    intros: [
      "その場では高く見えても、使ってみると案外納得する買い物はあります。",
      "値段だけで見ると強くても、使い道があるなら話は別です。",
      "少しでも生活がラクになるなら、その時点で意味はあります。",
      "買って終わりではなく、あとで役に立つなら十分です。"
    ],
    templates: [
      ({ item, formattedAmount, intro }) =>
        `${item}に${formattedAmount}を出したのは、勢いだけではなく使う理由があるからです。${intro} ちゃんと使うなら、ただの無駄ではありません。`,
      ({ item, perUse100, intro }) =>
        `${item}を100回使うと仮定すれば1回あたり${perUse100}です。${intro} 出番が多いなら、そこまで高い話ではありません。`,
      ({ item, perDay1Year, intro }) =>
        `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${intro} そのくらいで少し快適になるなら、十分ありです。`,
      ({ item, formattedAmount, intro }) =>
        `${formattedAmount}の${item}は高く見えても、使ってちゃんと役に立つなら意味があります。${intro} 後から便利だと思えるなら、それで十分です。`
    ]
  }
];

function formatCurrency(value) {
  return `${Number(value).toLocaleString("ja-JP")}円`;
}

function calculatePerUse(amount, count) {
  return formatCurrency(Math.round(amount / count));
}

function calculatePerDay(amount, days) {
  return formatCurrency(Math.round(amount / days));
}

function normalizeItemName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function getRecentList(key) {
  if (!recentExcusesByKey.has(key)) {
    recentExcusesByKey.set(key, []);
  }
  return recentExcusesByKey.get(key);
}

function pickRandom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function pickDifferent(array, previous) {
  if (array.length <= 1) {
    return array[0];
  }

  let choice = pickRandom(array);
  let attempts = 0;

  while (choice === previous && attempts < 10) {
    choice = pickRandom(array);
    attempts += 1;
  }

  return choice;
}

function detectCategory(itemName) {
  const lowered = itemName.toLowerCase();

  for (const config of categoryConfigs) {
    if (config.keywords.some((keyword) => lowered.includes(keyword.toLowerCase()))) {
      return config;
    }
  }

  return categoryConfigs.find((config) => config.name === "generic");
}

function buildTemplateData(itemName, amount, config) {
  const perUse100 = calculatePerUse(amount, 100);
  const perDay1Year = calculatePerDay(amount, 365);
  const perDay3Years = calculatePerDay(amount, 365 * 3);
  const formattedAmount = formatCurrency(amount);
  const intro = pickRandom(config.intros);

  return {
    item: itemName,
    amount,
    formattedAmount,
    perUse100,
    perDay1Year,
    perDay3Years,
    intro
  };
}

function buildExcuse(itemName, amount) {
  const config = detectCategory(itemName);
  const itemKey = `${config.name}:${itemName}:${amount}`;
  const recentList = getRecentList(itemKey);
  const previous = recentList[recentList.length - 1] || "";
  const data = buildTemplateData(itemName, amount, config);

  const candidates = config.templates.map((template) => template(data));
  const unused = candidates.filter((candidate) => !recentList.includes(candidate));
  const pool = unused.length > 0 ? unused : candidates;
  const excuse = pickDifferent(pool, previous);

  recentList.push(excuse);
  if (recentList.length > 12) {
    recentList.shift();
  }

  return excuse;
}

function clearErrors() {
  itemError.textContent = "";
  amountError.textContent = "";
}

function validateInputs() {
  clearErrors();

  const itemName = normalizeItemName(itemNameInput.value);
  const amountValue = amountInput.value.trim();
  const amount = Number(amountValue);
  let isValid = true;

  if (!itemName) {
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
    itemName,
    amount
  };
}

function showResult(text) {
  resultText.textContent = text;
  resultSection.classList.remove("hidden");
  resultSection.classList.remove("fade-in");
  void resultSection.offsetWidth;
  resultSection.classList.add("fade-in");
}

function generateExcuse() {
  const { isValid, itemName, amount } = validateInputs();

  if (!isValid) {
    return;
  }

  const excuse = buildExcuse(itemName, amount);
  lastExcuse = excuse;
  showResult(excuse);
}

async function copyExcuse() {
  if (!lastExcuse) {
    return;
  }

  try {
    await navigator.clipboard.writeText(lastExcuse);
    copyStatus.textContent = "コピーしました";

    if (copyTimerId) {
      window.clearTimeout(copyTimerId);
    }

    copyTimerId = window.setTimeout(() => {
      copyStatus.textContent = "";
    }, 1800);
  } catch (error) {
    copyStatus.textContent = "コピーできませんでした";

    if (copyTimerId) {
      window.clearTimeout(copyTimerId);
    }

    copyTimerId = window.setTimeout(() => {
      copyStatus.textContent = "";
    }, 1800);
  }
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
});

amountInput.addEventListener("input", () => {
  if (amountError.textContent) {
    amountError.textContent = "";
  }
});
