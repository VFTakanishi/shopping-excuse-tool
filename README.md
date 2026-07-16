# 買い物言い訳ツール

買った物と金額を入力すると、その出費を少しだけもっともらしく見せる短い言い訳を返す Web アプリです。  
登録済みの商品はブラウザ内のテンプレートだけで生成し、未登録の商品だけ Cloudflare Worker 経由で AI テンプレートを作ります。

## サービス概要

- 商品名と金額を入力すると、短くて少しくだらない言い訳を生成します
- 既知の商品は `script.js` 内のテンプレートだけで返します
- 未登録の商品は Worker に問い合わせ、AI が作ったテンプレートをキャッシュして再利用します
- 「別の言い訳を考える」で同じ入力でも別候補を順番に出します
- コピー機能つきです

## 生成方式

### 1. 登録済みの商品

以下のような、判定済みのカテゴリや商品はフロントエンドだけで生成します。

- スニーカー
- バッグ
- 整体
- グリーン車
- 海鮮丼
- スパチャ

この場合は外部 AI を呼びません。

### 2. 未登録の商品

登録されていない商品は、Cloudflare Worker に問い合わせます。

- Worker 側で Gemini API を呼ぶ
- 生成したテンプレートを KV に保存する
- 次回以降はキャッシュを返す
- 品質条件を満たさない返答は破棄する
- AI が使えないときは汎用文に逃げず、エラーを返す

## 外部 API について

このプロジェクトは次のように分かれています。

- フロントエンド本体は HTML / CSS / JavaScript だけで動きます
- 登録済み商品の言い訳生成は外部 API を使いません
- 未登録商品だけ Worker 経由で Gemini API を使います
- API キーはブラウザへ置かず、Worker の Secret に保存します

## ローカルでの起動方法

### フロントだけ確認する

1. このフォルダを開きます
2. `index.html` をブラウザで開きます

これで登録済み商品の生成はそのまま使えます。

### 未登録商品も確認する

1. `worker` フォルダへ移動します
2. `npm install` を実行します
3. `wrangler.toml.example` を `wrangler.toml` にコピーします
4. Cloudflare KV を作成して `AI_TEMPLATE_CACHE` を設定します
5. `wrangler secret put GEMINI_API_KEY` で API キーを登録します
6. 必要なら `GEMINI_MODEL` や `GEMINI_API_URL` を調整します
7. `npm run dev` で Worker を起動します
8. `script.js` の `WORKER_ENDPOINT` を Worker URL に変更します

## GitHub Pages で公開できること

フロントエンドは静的サイトなので、GitHub Pages にそのまま載せられます。

- `index.html`
- `style.css`
- `script.js`

ただし、未登録商品の AI 生成まで使う場合は、別途 Cloudflare Worker の公開が必要です。  
GitHub Pages だけでは Gemini API キーを安全に扱えません。

## ファイル構成

- `index.html`
  画面の構造
- `style.css`
  見た目とレスポンシブ対応
- `script.js`
  商品判定、テンプレート生成、コピー、Worker 連携
- `worker/src/index.js`
  Cloudflare Worker 本体
- `worker/package.json`
  Worker 用の依存関係
- `worker/wrangler.toml.example`
  Worker 設定例
- `README.md`
  この説明書

## 言い訳テンプレートを追加する方法

### 既知の商品を追加する

`script.js` の以下を追加・調整します。

1. `SUBTYPE_RULES`
   商品名からどのサブタイプへ振り分けるかを追加します
2. `TEMPLATE_MAP`
   その商品専用の言い訳テンプレートを追加します
3. 必要なら判定補助関数
   回数型、単発型、応援型のようなロジックが必要なら補助判定を追加します

### 未登録商品の AI 品質を調整する

`worker/src/index.js` の以下を調整します。

- `CATEGORY_HINTS`
  AI に渡すカテゴリヒント
- `BANNED_PHRASES`
  禁止表現
- `buildPrompt`
  AI への指示文
- `validateTemplates`
  返答の品質条件

## Worker の役割

Worker では次を担当します。

- 商品名の基本バリデーション
- 曖昧すぎる入力の拒否
- レート制限
- Gemini 呼び出し
- AI テンプレートの JSON 検証
- 禁止表現の除外
- KV キャッシュ保存
- CORS 対応

## 注意点

- `WORKER_ENDPOINT` が未設定のままだと、未登録商品はエラーになります
- これは仕様です。汎用のごまかし文へ自動フォールバックしません
- API キーは `script.js` に書かないでください
- GitHub Pages 側には Secret を置けません

## バージョン確認

フロントは次のバージョンを読み込みます。

- `2026.07.16-hybrid-1`

ブラウザの開発者ツールの Console で、次のような表示を確認できます。

```text
Shopping Excuse Tool 2026.07.16-hybrid-1
```
