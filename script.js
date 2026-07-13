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

const categoryRules = [
  { name: "fashion", keywords: ["靴", "スニーカー", "服", "コート", "バッグ", "シャツ", "パンツ", "ジャケット", "帽子"] },
  { name: "work", keywords: ["工具", "パソコン", "pc", "ノートpc", "スマホ", "iphone", "ipad", "キーボード", "マウス", "モニター"] },
  { name: "food", keywords: ["食事", "焼肉", "寿司", "ラーメン", "カフェ", "ランチ", "ディナー", "ごはん", "弁当", "丼", "海鮮丼", "定食", "うなぎ"] },
  { name: "fun", keywords: ["ゲーム", "漫画", "フィギュア", "アニメ", "プラモ", "小説", "dvd", "blu-ray", "ライブグッズ"] },
  { name: "travel", keywords: ["旅行", "ホテル", "チケット", "航空券", "新幹線", "宿", "ツアー"] },
  { name: "beauty", keywords: ["美容", "化粧品", "コスメ", "美容液", "日焼け止め", "スキンケア", "香水"] },
  { name: "home", keywords: ["家電", "家具", "掃除機", "冷蔵庫", "椅子", "デスク", "照明", "電子レンジ"] },
  { name: "vehicle", keywords: ["車", "バイク", "タイヤ", "ヘルメット", "部品", "オイル", "ドラレコ"] }
];

const categoryIntros = {
  fashion: [
    "身だしなみは趣味ではなく、外に出る自分のコンディション管理です。",
    "見た目が整うだけで、外出の気分と判断力は妙に安定します。"
  ],
  work: [
    "効率に関わる道具は、気合いでは埋められない時間差を埋めてくれます。",
    "作業環境への出費は、あとで地味に何度も回収されるタイプです。"
  ],
  food: [
    "食べることは娯楽でもありますが、同時に体力と機嫌の立て直しでもあります。",
    "ちゃんと満たされる食事は、気力を買っていると言っても大げさではありません。"
  ],
  fun: [
    "娯楽は贅沢に見えて、実は精神衛生の保守点検みたいなものです。",
    "好きなものに触れる時間は、雑に削ると生活全体がしょんぼりします。"
  ],
  travel: [
    "体験に使ったお金は、物より先に消えるようでいて意外と長く残ります。",
    "行く理由があるうちに動くのは、後悔の予防としてかなり優秀です。"
  ],
  beauty: [
    "自己管理に関わる出費は、派手さよりも日々の安心感を買う側面があります。",
    "整えるための費用は、気合いより再現性があるので案外まじめです。"
  ],
  home: [
    "生活環境に効く買い物は、毎日の細かいストレスを少しずつ回収してくれます。",
    "家で使う物こそ接触回数が多いので、満足度の積み上がりを侮れません。"
  ],
  vehicle: [
    "移動や維持に関わる出費は、趣味っぽく見えても安全と機動力に直結します。",
    "乗り物まわりは放置コストの方が高いことが多く、先に整える理屈が立ちます。"
  ],
  generic: [
    "こういう出費は一瞬だけ派手に見えて、あとから用途の広さで静かに回収していくタイプです。",
    "勢いに見えても、生活のどこかを少し楽にする買い物なら完全な無駄とは言い切れません。"
  ]
};

const sharedTemplates = [
  ({ item, formattedAmount, perUse100, categoryLine }) =>
    `${formattedAmount}は一瞬ひるむ金額ですが、100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} ${item}がそのたびに気分や効率を少しでも底上げするなら、これは散財というより日常の微調整費です。`,
  ({ item, perDay1Year, categoryLine }) =>
    `${item}を1年間使う前提なら、1日あたり約${perDay1Year}です。${categoryLine} その金額で毎日の小さな不便や気分の下振れを減らせるなら、買わなかった場合の後悔を避ける保険としてはむしろ穏当です。`,
  ({ item, perDay3Years, categoryLine }) =>
    `3年間使えれば、${item}は1日あたり約${perDay3Years}まで薄まります。${categoryLine} 長く使う前提の道具や体験は、買った日の痛みより後から効いてくるので、ここは未来の自分への先払いと解釈できます。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${item}に${formattedAmount}を出したのは、派手な贅沢というより生活の満足度を少し底上げする投資です。${categoryLine} ずっと我慢して別のところで機嫌を崩すくらいなら、先に整えた方が全体の収支は平和です。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${formattedAmount}という数字だけ見ると強そうですが、${item}で時間短縮や判断疲れの軽減が起きるなら話は変わります。${categoryLine} だらだら悩む時間まで含めて考えると、むしろ出費に仕事をしてもらう発想です。`,
  ({ item, compareAmount, categoryLine }) =>
    `${item}は高く見えても、他の大きな出費と比べると意外と小回りの利く金額です。たとえば${compareAmount}級の支出ほど身構える話ではありません。${categoryLine} それで日々の気分や快適さが増えるなら、充分に説明のつく買い物です。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${item}に払った${formattedAmount}は、勉強代や経験値の前払いとして考えると急に落ち着いて見えてきます。${categoryLine} 何が自分に効くか実地で知るのも立派な収穫なので、ただの物欲で片づけるには少し惜しいです。`,
  ({ item, perUse100, categoryLine }) =>
    `${item}は100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} そのたびに「やっぱりこれでよかった」と思えるなら、安いか高いかより、満足の再現性を買ったと考える方がしっくりきます。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${formattedAmount}を自分のメンテナンス費用だと思えば、${item}はそこまで無茶な買い物ではありません。${categoryLine} 壊れてから直すより、先に整えておく方が結局は安上がりという理屈で押し切れます。`,
  ({ item, perDay1Year, categoryLine }) =>
    `${item}を1年間使う前提なら1日あたり約${perDay1Year}で、気分転換・効率化・満足度のどれかが少し付いてきます。${categoryLine} それで生活のノイズが減るなら、これは経済を回しつつ自分も守る、妙に丸い判断です。`
];

const categoryTemplates = {
  fashion: [
    ({ item, perUse100, categoryLine }) =>
      `${item}は100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} 出かけるたびに服装の迷いが減って気分まで少し上向くなら、見た目のためというより外出の調子を整える費用です。`,
    ({ item, perDay1Year, categoryLine }) =>
      `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${categoryLine} 毎朝の「なんか決まらない」を減らせるなら、これはおしゃれ代というより機嫌の安定装置としてかなり優秀です。`
  ],
  work: [
    ({ item, perUse100, categoryLine }) =>
      `${item}は100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} 一回ごとの作業が少し速くなるだけでも回収が始まるので、勢いの買い物というより仕事に働いてもらう出費です。`,
    ({ item, perDay3Years, categoryLine }) =>
      `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${categoryLine} 毎日の引っかかりを減らして集中を取り戻せるなら、気合いで耐えるより先に道具を整える方がずっと健全です。`
  ],
  food: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を払ったのは、空腹を埋めただけではなく、ちゃんと満たされた時間を買ったと考えると筋が通ります。${categoryLine} 変に妥協してずっと微妙な気分を引きずるより、その場でしっかり回復した方が一日全体はむしろ平和です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は安いとは言いませんが、気分転換と体力回復をまとめて済ませたと思えば急に納得感が出てきます。${categoryLine} ただ食べたというより、今日はこれで機嫌を立て直したと言い張れる種類の出費です。`,
    ({ item, categoryLine, compareAmount }) =>
      `${item}は一食として見ると強気でも、後悔の残る中途半端な出費を何回も重ねるよりは話が早いです。たとえば${compareAmount}級の大きな買い物と違って傷は浅く、満足はその日のうちに回収できます。${categoryLine}`
  ],
  fun: [
    ({ item, perUse100, categoryLine }) =>
      `${item}は100回触れると仮定すれば1回あたり${perUse100}です。${categoryLine} 仕事でも義務でもない時間をちゃんと守れるなら、これは浪費というより精神の消耗品を補充した扱いでいいはずです。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を出したのは、単なる趣味出費ではなく、好きなものに触れて気力を戻すための投資です。${categoryLine} 何も楽しみがない状態を長引かせる方が、たぶんじわじわ高くつきます。`
  ],
  travel: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を払ったのは、移動や宿泊そのものより「今行ける機会」を確保した費用と考えるとかなり自然です。${categoryLine} 行かなかった後悔は長引きがちなので、その予防としてはむしろ手堅い判断です。`,
    ({ item, perDay1Year, categoryLine }) =>
      `${item}の記憶を1年間じわじわ思い出す前提なら、1日あたり約${perDay1Year}で気分転換の余韻が残る計算です。${categoryLine} 体験に使うお金はその場で消えるようで、あとから何度も効いてくるのがずるいところです。`
  ],
  beauty: [
    ({ item, perDay1Year, categoryLine }) =>
      `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${categoryLine} 毎日の「ちょっと気になる」を減らせるなら、これはぜいたくというより自己管理を続けるための実務費です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は派手に見えても、見た目と気分の両方を整える道具だと思えば説明はつきます。${categoryLine} 調子がいい日の再現率を上げるなら、十分まじめな買い物です。`
  ],
  home: [
    ({ item, perDay3Years, categoryLine }) =>
      `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${categoryLine} 家で触れる回数の多さを考えると、毎日の小さな面倒を減らす買い物は見た目以上に元が取りやすいです。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を出したのは、部屋の見た目より生活の引っかかりを減らすためと考えるとかなり穏当です。${categoryLine} 家の中の微妙なストレスは毎日積もるので、早めに対処する理屈が立ちます。`
  ],
  vehicle: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を払ったのは、趣味っぽく見えても移動の安心感や維持の安定を買った側面があります。${categoryLine} 調子が悪いまま先延ばしにする方が高くつくことが多いので、これは先回りの出費です。`,
    ({ item, perDay3Years, categoryLine }) =>
      `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${categoryLine} 安全と機動力に関わるものは、買った瞬間の金額だけでなく、困らない日を増やせるかで見る方が納得しやすいです。`
  ],
  generic: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を出したのは、思いつきに見えて実は日常のどこかを少し楽にする調整だと考えられます。${categoryLine} 完全な必需品ではなくても、使ったあとに生活が少しでも丸くなるなら十分に理屈は立ちます。`
  ]
};

const bridges = [
  "しかも",
  "さらに言うと",
  "冷静に考えると",
  "雑に言えば",
  "わりと大事なのは",
  "ここで見落としがちなのは"
];

function formatYen(amount) {
  return `${amount.toLocaleString("ja-JP")}円`;
}

function calculateRounded(value) {
  return Math.max(1, Math.round(value));
}

function normalizeJapaneseText(text) {
  return text.trim().normalize("NFKC").toLowerCase();
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pickUnique(array, usedSet) {
  const candidates = array.filter((value) => !usedSet.has(value));
  const source = candidates.length > 0 ? candidates : array;
  const choice = source[Math.floor(Math.random() * source.length)];
  usedSet.add(choice);
  return choice;
}

function detectCategory(itemName) {
  const normalized = normalizeJapaneseText(itemName);
  for (const rule of categoryRules) {
    if (rule.keywords.some((keyword) => normalized.includes(normalizeJapaneseText(keyword)))) {
      return rule.name;
    }
  }
  return "generic";
}

function buildItemPhrase(itemName) {
  return itemName.trim().normalize("NFKC").replace(/\s+/g, " ");
}

function buildExcuse(itemName, amount) {
  const item = buildItemPhrase(itemName);
  const category = detectCategory(item);
  const usedParts = new Set();
  const categoryLine = pickUnique(categoryIntros[category] || categoryIntros.generic, usedParts);
  const categoryOnly = category === "food" || category === "travel";
  const templatePool = categoryOnly
    ? [...(categoryTemplates[category] || categoryTemplates.generic)]
    : [...(categoryTemplates[category] || []), ...sharedTemplates];
  const template = pickUnique(templatePool, usedParts);
  const bridge = pickUnique(bridges, usedParts);
  const formattedAmount = formatYen(amount);
  const perUse100 = formatYen(calculateRounded(amount / 100));
  const perDay1Year = formatYen(calculateRounded(amount / 365));
  const perDay3Years = formatYen(calculateRounded(amount / (365 * 3)));
  const compareAmount = formatYen(calculateRounded(amount * 3.2));

  let excuse = template({
    item,
    amount,
    formattedAmount,
    perUse100,
    perDay1Year,
    perDay3Years,
    compareAmount,
    categoryLine
  });

  if (lastExcuse && excuse === lastExcuse) {
    const extraTemplate = pickUnique(templatePool, usedParts);
    excuse = extraTemplate({
      item,
      amount,
      formattedAmount,
      perUse100,
      perDay1Year,
      perDay3Years,
      compareAmount,
      categoryLine
    });
  }

  excuse = excuse.replace(new RegExp(escapeRegExp(categoryLine), "g"), `${bridge} ${categoryLine}`);
  excuse = excuse.replace(`${bridge} `, "");
  lastExcuse = excuse;
  return excuse;
}

function clearErrors() {
  itemError.textContent = "";
  amountError.textContent = "";
}

function validateInputs(itemName, amountValue) {
  let isValid = true;
  clearErrors();

  if (!itemName.trim()) {
    itemError.textContent = "商品名を入力してください。";
    isValid = false;
  }

  if (amountValue === "") {
    amountError.textContent = "金額を入力してください。";
    isValid = false;
  } else {
    const amount = Number(amountValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      amountError.textContent = "金額は1円以上で入力してください。";
      isValid = false;
    }
  }

  return isValid;
}

function renderExcuse() {
  const itemName = itemNameInput.value;
  const amountValue = amountInput.value;

  if (!validateInputs(itemName, amountValue)) {
    resultSection.classList.add("hidden");
    return;
  }

  const amount = Math.floor(Number(amountValue));
  const excuse = buildExcuse(itemName, amount);
  resultText.textContent = excuse;
  copyStatus.textContent = "";
  resultSection.classList.remove("hidden");
}

async function copyExcuse() {
  if (!resultText.textContent) {
    return;
  }

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(resultText.textContent);
    } else {
      const helper = document.createElement("textarea");
      helper.value = resultText.textContent;
      helper.setAttribute("readonly", "");
      helper.style.position = "absolute";
      helper.style.left = "-9999px";
      document.body.appendChild(helper);
      helper.select();
      document.execCommand("copy");
      document.body.removeChild(helper);
    }
    copyStatus.textContent = "コピーしました";
    window.clearTimeout(copyTimerId);
    copyTimerId = window.setTimeout(() => {
      copyStatus.textContent = "";
    }, 1600);
  } catch (error) {
    copyStatus.textContent = "コピーに失敗しました";
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  renderExcuse();
});

regenerateButton.addEventListener("click", () => {
  renderExcuse();
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
