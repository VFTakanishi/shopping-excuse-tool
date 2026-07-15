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
  { name: "bag", keywords: ["バッグ", "かばん", "鞄", "リュック", "トート", "ショルダー", "ボディバッグ"] },
  { name: "fashion", keywords: ["靴", "スニーカー", "服", "コート", "シャツ", "パンツ", "ジャケット", "帽子"] },
  { name: "work", keywords: ["工具", "パソコン", "pc", "ノートpc", "スマホ", "iphone", "ipad", "キーボード", "マウス", "モニター"] },
  { name: "food", keywords: ["食事", "焼肉", "寿司", "ラーメン", "カフェ", "ランチ", "ディナー", "ごはん", "弁当", "丼", "海鮮丼", "定食", "うなぎ"] },
  { name: "fun", keywords: ["ゲーム", "漫画", "フィギュア", "アニメ", "プラモ", "小説", "dvd", "blu-ray", "ライブグッズ"] },
  { name: "adultService", keywords: ["風俗", "ソープ", "ヘルス", "デリヘル", "ピンサロ", "ホテヘル"] },
  { name: "sponsorship", keywords: ["スポンサー", "スポンサー枠", "支援", "投げ銭", "スパチャ", "fanbox", "patreon", "メンバーシップ"] },
  { name: "premiumTransit", keywords: ["グリーン車", "プレミアムシート", "アップグレード席", "ファーストクラス", "ビジネスクラス"] },
  { name: "personalService", keywords: ["整体", "マッサージ", "エステ", "もみほぐし", "リラク", "クリーニング", "パーソナル", "ジム", "サウナ"] },
  { name: "travel", keywords: ["旅行", "ホテル", "チケット", "航空券", "新幹線", "宿", "ツアー"] },
  { name: "beauty", keywords: ["美容", "化粧品", "コスメ", "美容液", "日焼け止め", "スキンケア", "香水"] },
  { name: "home", keywords: ["家電", "家具", "掃除機", "冷蔵庫", "椅子", "デスク", "照明", "電子レンジ"] },
  { name: "vehicle", keywords: ["車", "バイク", "タイヤ", "ヘルメット", "部品", "オイル", "ドラレコ"] }
];

const categoryIntros = {
  bag: [
    "バッグは毎回持つものなので、使いやすさがそのまま満足度に出ます。",
    "荷物がまとまるバッグは、それだけで出かけるときのストレスが減ります。",
    "服に合わせやすいバッグは、結局いちばん出番が多くなります。",
    "毎回これでいいと思えるバッグなら、値段だけでは判断しにくいです。"
  ],
  fashion: [
    "靴が決まると、出かけるときの気分がだいぶ違います。",
    "履きやすくて合わせやすい靴は、結局いちばん出番が多くなります。",
    "気に入っている靴があるだけで、外に出るハードルは少し下がります。",
    "よく履く靴なら、値段だけで高い安いを決めるのも違います。"
  ],
  work: [
    "仕事道具は、使いやすいだけでかなり差が出ます。",
    "作業で毎回引っかかるものは、早めに替えた方がラクです。",
    "仕事で使うものは、毎日触るぶんだけ差が積み上がります。",
    "道具が合うだけで、作業のしんどさはかなり変わります。"
  ],
  food: [
    "ちゃんと満足できるごはんは、その日の気分まで変わります。",
    "おいしいものを食べた日は、それだけで少し機嫌がよくなります。",
    "食事はただ空腹を埋めるだけじゃなくて、気分を戻す役目もあります。",
    "満足できる一食なら、その金額に意味はあります。"
  ],
  fun: [
    "好きなものにお金を使う日がある方が、普通に気分は持ちます。",
    "趣味があるだけで、しんどい週も少しはやり過ごせます。",
    "楽しいことに使うお金は、思ったよりちゃんと効きます。",
    "何も楽しみがない状態よりは、ずっと健全です。"
  ],
  adultService: [
    "こういう出費は胸を張って説明する類いではないですが、雑に片づけると逆に実感から遠ざかります。",
    "欲だけで終わる話に見えても、気分の切り替えや息抜きとして処理している人は案外多いです。",
    "人には言いにくい出費でも、その場でちゃんと気が晴れたなら意味がゼロとは言えません。"
  ],
  sponsorship: [
    "応援したいものにお金を使うなら、それだけで十分理由になります。",
    "スポンサー枠は物が残る買い方ではなくても、自分が納得して払っているならそれでいいです。",
    "好きで応援しているものに使ったお金なら、無駄と決めつける話でもありません。"
  ],
  premiumTransit: [
    "移動で疲れすぎないことにお金を使うのは、思ったよりちゃんと意味があります。",
    "座れる、静か、ラク、その差で目的地に着いた後の調子が変わります。",
    "移動を少しラクにする出費は、贅沢というより消耗を減らすためのものです。"
  ],
  personalService: [
    "体がラクになる出費は、物が残らなくても十分元を取りにいけます。",
    "体の重さやだるさが減るなら、その時点でかなり意味があります。",
    "自分の調子が戻るなら、サービス代というより必要経費に近いです。"
  ],
  travel: [
    "旅行やチケットは、その場だけで終わるお金ではありません。",
    "行けるときに行っておく方が、あとで後悔しにくいです。",
    "出かけた日の満足は、思ったより長く残ります。",
    "行く理由があるなら、動いた方があとで納得できます。"
  ],
  beauty: [
    "美容まわりは見た目だけじゃなくて、気分にも効きます。",
    "ちゃんと整っているだけで、余計な気疲れが減ります。",
    "自分の見た目に納得できる日は、それだけで少しラクです。",
    "毎日の身支度がスムーズになるなら、十分意味があります。"
  ],
  home: [
    "家で使うものは、地味でも毎日効きます。",
    "家の中の面倒が一つ減るだけで、かなりラクになります。",
    "毎日触るものなら、使いやすさにお金をかける意味はあります。",
    "生活のしんどさを減らす買い物は、派手じゃなくても大事です。"
  ],
  vehicle: [
    "車やバイクまわりは、早めに手を入れた方がラクです。",
    "移動手段にお金をかけるのは、趣味だけの話ではありません。",
    "あとで困らないための出費だと思えば、かなり普通です。",
    "安全に動ける状態を保つなら、そのお金には意味があります。"
  ],
  generic: [
    "その場では高く見えても、使ってみると案外納得する買い物はあります。",
    "少しでも生活がラクになるなら、完全な無駄ではありません。",
    "買って終わりではなく、あとで便利なら意味はあります。",
    "値段だけで見ると強くても、使い道があるなら話は別です。"
  ]
};

const sharedTemplates = [
  ({ item, formattedAmount, perUse100, categoryLine }) =>
    `${formattedAmount}は高く見えても、100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} ちゃんと使うなら、そこまで無茶な買い物ではありません。`,
  ({ item, perDay1Year, categoryLine }) =>
    `${item}を1年間使う前提なら、1日あたり約${perDay1Year}です。${categoryLine} そのくらいで少しラクになるなら、十分ありです。`,
  ({ item, perDay3Years, categoryLine }) =>
    `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${categoryLine} 長く使うなら、普通に元は取れます。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${item}に${formattedAmount}を出したのは、見た目ほど無茶な話ではありません。${categoryLine} 使ってちゃんと役に立つなら、それで十分です。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${formattedAmount}だけ見ると高く感じますが、${item}で手間が減るなら話は変わります。${categoryLine} その分ラクになるなら、十分ありです。`,
  ({ item, compareAmount, categoryLine }) =>
    `${item}は高く見えても、${compareAmount}級の大きな買い物ほどではありません。${categoryLine} 納得して使えるなら、そこまで構える話でもないです。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${item}に${formattedAmount}を出したのは、勢いだけではなく使う理由があるからです。${categoryLine} ちゃんと使うなら、欲しかっただけで終わる話ではありません。`,
  ({ item, perUse100, categoryLine }) =>
    `${item}は100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} 毎回ちゃんと使うなら、普通に元は取れます。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${formattedAmount}を必要経費だと思えば、${item}はそこまで無茶な買い物ではありません。${categoryLine} 後で困るくらいなら、先に整えた方がラクです。`,
  ({ item, perDay1Year, categoryLine }) =>
    `${item}を1年間ちゃんと使う前提なら、1日あたり約${perDay1Year}です。${categoryLine} そのくらいで少し快適になるなら、十分です。`,
  ({ item, formattedAmount, categoryLine, perDay3Years }) =>
    `${formattedAmount}は高く見えても、${item}を3年使うなら1日あたり約${perDay3Years}です。${categoryLine} 長く使うなら、そこまで高い話ではありません。`,
  ({ item, compareAmount, categoryLine }) =>
    `${item}の出費は大きく見えても、${compareAmount}級の本気で重い出費とは別です。${categoryLine} 使いどころがあるなら、そこまで気にしすぎなくていいです。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${item}に${formattedAmount}を使ったのは、気分だけではなく面倒を減らすためでもあります。${categoryLine} そのあと少しでもラクになるなら、悪くないです。`,
  ({ item, perUse100, categoryLine }) =>
    `${item}は100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} 出番が多いなら、その金額にも納得できます。`,
  ({ item, perDay1Year, categoryLine }) =>
    `${item}を1年間ちゃんと使う前提なら、1日あたり約${perDay1Year}です。${categoryLine} その積み重ねまで見れば、思ったほど高くありません。`,
  ({ item, formattedAmount, categoryLine }) =>
    `${formattedAmount}の${item}は高く見えても、毎日の小さな不満が減るなら意味があります。${categoryLine} 使ってラクになるなら、それで十分です。`
];

const categoryTemplates = {
  bag: [
    ({ item, perUse100, categoryLine }) =>
      `${item}は100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} 毎回ちゃんと使うなら、けして高すぎる買い物ではありません。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を出したのは、見た目だけではなく使いやすさも込みです。${categoryLine} 荷物がまとまって、毎回これで済むなら十分元は取れます。`,
    ({ item, perDay1Year, categoryLine }) =>
      `${item}を1年間しっかり使う前提なら1日あたり約${perDay1Year}です。${categoryLine} 服に合わせやすくて出番が多いなら、その金額に見合っています。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}でも、毎回持つことを考えれば高いだけではありません。${categoryLine} 安いものを何となく買い替えるより、気に入ったものを長く使う方が納得できます。`
  ],
  fashion: [
    ({ item, perUse100, categoryLine }) =>
      `${item}は100回履くと仮定すれば1回あたり${perUse100}です。${categoryLine} そのたびにちゃんと履くなら、けして高すぎる買い物ではありません。`,
    ({ item, perDay1Year, categoryLine }) =>
      `${item}を1年間しっかり履く前提なら1日あたり約${perDay1Year}です。${categoryLine} それで毎回気分よく出かけられるなら、十分元は取れます。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を出したのは、安い靴を何足も買い直すより、ちゃんと履く一足を選んだと思えば納得しやすいです。${categoryLine} よく履くなら、その分ちゃんと回収できます。`,
    ({ item, perDay3Years, categoryLine }) =>
      `3年くらい履けるなら、${item}は1日あたり約${perDay3Years}です。${categoryLine} それで出かけるたびに気分が上がるなら、むしろ安いです。`
  ],
  work: [
    ({ item, perUse100, categoryLine }) =>
      `${item}は100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} 一回ごとの作業が少し速くなるだけでも回収が始まるので、勢いの買い物というより仕事に働いてもらう出費です。`,
    ({ item, perDay3Years, categoryLine }) =>
      `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${categoryLine} 毎日の引っかかりを減らして集中を取り戻せるなら、気合いで耐えるより先に道具を整える方がずっと健全です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を払うのは勢いに見えて、実際は作業の詰まりを先に取り除く処置に近いです。${categoryLine} 毎回の小さな待ち時間やイライラが減るなら、十分に元を取る余地があります。`,
    ({ item, perDay1Year, categoryLine }) =>
      `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${categoryLine} その金額で作業中の引っかかりを少しでも減らせるなら、節約より先に環境改善を選ぶ理屈が立ちます.`
  ],
  food: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を払ったのは、ただ食べるためというより、ちゃんと満足するためです。${categoryLine} おいしく食べて気分まで上がったなら、それで十分元は取れています。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は安いとは言いませんが、ちゃんと満足できたなら高すぎるとも言えません。${categoryLine} 変に安く済ませて物足りないより、食べたいものを食べた方がすっきりします。`,
    ({ item, categoryLine, compareAmount }) =>
      `${item}は一食として見ると強気でも、${compareAmount}級の大きな買い物に比べればそこまで身構える話ではありません。${categoryLine} その場で満足できるなら、ちゃんと意味のある出費です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は安くはなくても、「食べてよかった」と思えたなら十分です。${categoryLine} ちゃんと満足できたなら、それでこの出費は成立しています。`,
    ({ item, categoryLine }) =>
      `${item}は贅沢寄りに見えても、ちゃんとおいしいものを食べた日はそのあとまで気分よく過ごせます。${categoryLine} それなら、ただ高いだけの出費ではありません。`
  ],
  fun: [
    ({ item, perUse100, categoryLine }) =>
      `${item}は100回触れると仮定すれば1回あたり${perUse100}です。${categoryLine} 仕事でも義務でもない時間をちゃんと守れるなら、これは浪費というより精神の消耗品を補充した扱いでいいはずです。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を出したのは、単なる趣味出費ではなく、好きなものに触れて気力を戻すための投資です。${categoryLine} 何も楽しみがない状態を長引かせる方が、たぶんじわじわ高くつきます。`,
    ({ item, perDay1Year, categoryLine }) =>
      `${item}の余韻を1年間で薄く広く楽しむ前提なら、1日あたり約${perDay1Year}です。${categoryLine} 生活のどこかに「これ好きなんだよな」があるだけで、案外ちゃんと踏ん張れます。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は冷静に見ると趣味の出費ですが、逆に言えば冷静さを保つための趣味でもあります。${categoryLine} 心のガソリンが切れた状態で全部を回すより、よほど筋がいいです。`
  ],
  adultService: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を使ったのは、胸を張れる話ではなくても、気分転換として見ればそこまで意味不明な出費ではありません。${categoryLine} 変に引きずるくらいなら、そこで切り替えができた時点で役目は果たしています。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は人に説明しづらいだけで、自分の中で息抜きとして処理できているなら話は別です。${categoryLine} ずっと我慢して変な方向にこじらせるより、短く消化して終わるならまだ平和です。`,
    ({ item, compareAmount, categoryLine }) =>
      `${item}は褒められる出費ではなくても、${compareAmount}級の大ごとになるわけでもなく、その場で気持ちに区切りがつくなら一応の理屈は立ちます。${categoryLine}`
  ],
  sponsorship: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を出したのは、物を買ったというより応援の気持ちにお金を使った形です。${categoryLine} 自分が納得して払っているなら、それで十分です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は実用品ではなくても、「応援したいから払う」でちゃんと筋が通ります。${categoryLine} 好きで払っているなら、無理に損得だけで見る必要はありません。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は物が残る使い方ではなくても、自分が好きなものを支えた感覚はちゃんと残ります。${categoryLine} そう思えているなら、十分意味のあるお金の使い方です。`
  ],
  premiumTransit: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を払ったのは、贅沢というより移動で疲れないためです。${categoryLine} 着いたあとにちゃんと動けるなら、結果的に得です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は高く見えても、移動でぐったりしないだけで意味があります。${categoryLine} 目的地に着いてからちゃんと動けるなら、その分は回収できます。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を足したのは、席の違いというより体力を残すためです。${categoryLine} 移動で潰れずに済むなら、必要な経費として十分ありです。`
  ],
  personalService: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を払ったのは、その場しのぎではなく体をちゃんと戻すためです。${categoryLine} 受けたあとに体がラクになって動けるなら、結果的に得しています。`,
    ({ item, perDay1Year, categoryLine }) =>
      `${item}を1年間の中で何度か使う前提なら、1日あたり約${perDay1Year}です。${categoryLine} 体が整ってラクになって、そのあと動けるなら普通に元は取れます。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は物が残らないぶん高く見えますが、体が軽くなって仕事や生活が回りやすくなるなら高くありません。${categoryLine} その後の生産性まで含めると、むしろ得です。`
  ],
  travel: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を払ったのは、移動や宿泊そのものより「今行ける機会」を確保した費用と考えるとかなり自然です。${categoryLine} 行かなかった後悔は長引きがちなので、その予防としてはむしろ手堅い判断です。`,
    ({ item, perDay1Year, categoryLine }) =>
      `${item}の記憶を1年間じわじわ思い出す前提なら、1日あたり約${perDay1Year}で気分転換の余韻が残る計算です。${categoryLine} 体験に使うお金はその場で消えるようで、あとから何度も効いてくるのがずるいところです。`,
    ({ item, categoryLine, compareAmount }) =>
      `${item}は安くはなくても、行かなかった場合にあとから残る「あのとき行けばよかった」を考えるとむしろ被害を減らしています。${categoryLine} ${compareAmount}級の大きな後悔に育つ前に動けたと思えば、かなり上出来です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は移動費というより、今しかないタイミングを取り逃がさないための席料みたいなものです。${categoryLine} 予定が形になるだけで、日常の景色が少し変わるタイプの出費です。`
  ],
  beauty: [
    ({ item, perDay1Year, categoryLine }) =>
      `${item}を1年間使う前提なら1日あたり約${perDay1Year}です。${categoryLine} 毎日の「ちょっと気になる」を減らせるなら、これは贅沢というより自己管理を続けるための実務費です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は派手に見えても、見た目と気分の両方を整える道具だと思えば説明はつきます。${categoryLine} 調子がいい日の再現率を上げるなら、十分まじめな買い物です。`,
    ({ item, perDay3Years, categoryLine }) =>
      `3年間のうち使える期間をならして考えると、${item}は1日あたり約${perDay3Years}です。${categoryLine} ちょっとした不安や気後れを減らせるなら、かなり実務寄りの出費です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を使うのは贅沢に見えますが、毎回の身支度を少しスムーズにする装備だと思えば納得しやすいです。${categoryLine} ちゃんと整っている感覚は、それだけで一日のノイズを減らします。`
  ],
  home: [
    ({ item, perDay3Years, categoryLine }) =>
      `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${categoryLine} 家で触れる回数の多さを考えると、毎日の小さな面倒を減らす買い物は見た目以上に元が取りやすいです。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を出したのは、部屋の見た目より生活の引っかかりを減らすためと考えるとかなり穏当です。${categoryLine} 家の中の微妙なストレスは毎日積もるので、早めに対処する理屈が立ちます。`,
    ({ item, perUse100, categoryLine }) =>
      `${item}は100回使うと仮定すれば1回あたり${perUse100}です。${categoryLine} 家の中で何度も触るものなら、使うたびに「前より楽」を積み上げるので想像より回収が早いです。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}はその日だけを見ると高くても、毎日のちょっとした面倒を肩代わりしてくれるなら十分に役割があります。${categoryLine} 生活の地味な詰まりを減らす買い物は、派手ではないぶん評価されにくいだけです。`
  ],
  vehicle: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を払ったのは、趣味っぽく見えても移動の安心感や維持の安定を買った側面があります。${categoryLine} 調子が悪いまま先延ばしにする方が高くつくことが多いので、これは先回りの出費です。`,
    ({ item, perDay3Years, categoryLine }) =>
      `3年間使えれば、${item}は1日あたり約${perDay3Years}です。${categoryLine} 安全と機動力に関わるものは、買った瞬間の金額だけでなく、困らない日を増やせるかで見る方が納得しやすいです。`,
    ({ item, compareAmount, categoryLine }) =>
      `${item}は金額だけ見ると身構えますが、移動不能や不調が生む面倒と比べればむしろ先に払っておく方が傷が浅いです。${categoryLine} ${compareAmount}級の厄介ごとを防ぐ予防費だと思えば、だいぶ穏当です。`,
    ({ item, formattedAmount, categoryLine }) =>
      `${formattedAmount}の${item}は趣味にも見えますが、実際は安心して動ける状態を維持するための整備寄りの支払いです。${categoryLine} 何か起きてから慌てるより、先に静かに片づけておく方が大人です。`
  ],
  generic: [
    ({ item, formattedAmount, categoryLine }) =>
      `${item}に${formattedAmount}を出したのは、思いつきに見えて実は日常のどこかを少し楽にする調整だと考えられます。${categoryLine} 完全な必需品ではなくても、使ったあとに生活が少しでも丸くなるなら十分に理屈は立ちます。`,
    ({ item, perDay1Year, categoryLine }) =>
      `${item}を1年間それなりに活用する前提なら、1日あたり約${perDay1Year}です。${categoryLine} その単価でちょっと便利か少し快適が買えるなら、案外ちゃんとした買い物です。`,
    ({ item, compareAmount, categoryLine }) =>
      `${item}は一瞬だけ高く見えても、${compareAmount}級の本気で重い出費に比べればまだ理性のある範囲です。${categoryLine} 納得して使える場面があるなら、そこまで肩身の狭い買い物ではありません。`
  ]
};

const categoryClosers = {
  bag: [
    "毎回これで済むなら、その時点でかなり優秀です。",
    "出番が多いバッグなら、普通に元は取れます。"
  ],
  fashion: [
    "ちゃんと履くなら、値段ぶんは十分返ってきます。",
    "出番が多い一足なら、高いというほどでもありません。"
  ],
  work: [
    "仕事道具は、一度ちゃんと噛み合うと想像以上に何度も回収してくれます。",
    "作業が止まる回数を減らせるだけでも、数字以上の価値があります。"
  ],
  food: [
    "ちゃんと満足できたなら、それで十分です。",
    "食べて気分が上がったなら、そのお金には意味があります。"
  ],
  fun: [
    "楽しみを後回しにしすぎないのは、意外と立派な生活防衛です。",
    "好きなものがちゃんと効くなら、それは浪費ではなく回復手段です。"
  ],
  adultService: [
    "人には言いにくくても、自分の中でちゃんと切り替えになっているならそれなりに仕事はしています。",
    "少なくとも、あとまで引きずるよりその場で区切りがついたなら意味はあります。"
  ],
  sponsorship: [
    "応援したくて払ったなら、それは無駄ではありません。",
    "自分で納得して出したお金なら、それで十分です。"
  ],
  premiumTransit: [
    "移動で疲れないだけで、その後の動きやすさが全然違います。",
    "現地でちゃんと動けるなら、その差にお金を払う意味はあります。"
  ],
  personalService: [
    "体が整ってラクになるなら、その時点でかなり回収できています。",
    "そのあとちゃんと動けるなら、十分元は取れます。"
  ],
  travel: [
    "あとから思い出して得するタイプの出費は、数字以上にコスパが読みにくくて強いです。",
    "行けるうちに動けたなら、それだけでかなり勝っています。"
  ],
  beauty: [
    "自分の調子を整える費用だと思えば、かなり説明のしやすい買い物です。",
    "日々の小さな不安が減るなら、値段以上に働いています。"
  ],
  home: [
    "毎日触るものが快適になる出費は、派手さがないだけで実益はかなりあります。",
    "生活の詰まりを減らす買い物は、あとからじわじわ評価が上がるタイプです。"
  ],
  vehicle: [
    "困らない日を増やすための出費は、あとから見ればだいたい正しかったことになります。",
    "移動の安心感は、失ってから高く感じる類いの価値です。"
  ],
  generic: [
    "生活のどこかが少し楽になるなら、その時点で完全敗北ではありません。",
    "少なくとも、何も考えずに散らしたお金ではないと言い張れる余地があります。"
  ]
};

const bridges = [
  "しかも",
  "さらに言うと",
  "冷静に考えると",
  "雑に言えば",
  "わりと大事なのは",
  "ここで見落としがちなのは",
  "地味ですが",
  "つまるところ",
  "見逃しにくいのは"
];

const tagLines = [
  "要するに、ただ欲しかっただけと言い切るには少し惜しい買い物です。",
  "雑にまとめると、気分か効率か後悔のどれかは確実に減らしています。",
  "つまりこれは、出費というより自分の運用コストを少し整えた話です。",
  "結論としては、思ったよりちゃんと理屈のある散財です。",
  "少なくとも、あとから何も残らないタイプの使い方ではありません。"
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

const strictCategoryPools = {
  bag: "categoryOnly",
  fashion: "categoryOnly",
  food: "categoryOnly",
  fun: "categoryOnly",
  travel: "categoryOnly",
  beauty: "categoryOnly",
  adultService: "categoryOnly",
  sponsorship: "categoryOnly",
  premiumTransit: "categoryOnly",
  personalService: "categoryOnly"
};

function buildExcuseVariant(itemName, amount) {
  const item = buildItemPhrase(itemName);
  const category = detectCategory(item);
  const usedParts = new Set();
  const categoryLine = pickUnique(categoryIntros[category] || categoryIntros.generic, usedParts);
  const categoryOnly = strictCategoryPools[category] === "categoryOnly";
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
  const closer = pickUnique(categoryClosers[category] || categoryClosers.generic, usedParts);
  const tagLine = pickUnique(tagLines, usedParts);
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
  const allowExtraLines = !["sponsorship", "premiumTransit"].includes(category);
  const addCloser = allowExtraLines && Math.random() < 0.7 && excuse.length < 118;
  const addTagLine = allowExtraLines && Math.random() < 0.25 && excuse.length < 102;

  if (addCloser) {
    excuse += ` ${bridge}、${closer}`;
  }

  if (addTagLine && excuse.length < 145) {
    excuse += ` ${tagLine}`;
  }

  return excuse;
}

function buildExcuse(itemName, amount) {
  let bestExcuse = "";

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = buildExcuseVariant(itemName, amount);
    if (candidate !== lastExcuse) {
      lastExcuse = candidate;
      return candidate;
    }
    bestExcuse = candidate;
  }

  lastExcuse = bestExcuse;
  return bestExcuse;
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
