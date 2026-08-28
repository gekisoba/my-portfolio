# my-portfolio

個人開発ポートフォリオサイト。素の HTML / CSS / JavaScript のみで構成し、Cloudflare Pages で公開しています。

## 構成

```
.
├── index.html          # ページ本体（表示するデータは JS で流し込み）
├── assets/
│   ├── style.css       # スタイル（ライト / ダーク両対応）
│   ├── main.js         # data.json を読み込んで描画・絞り込み
│   ├── data.json       # 掲載する作品データ（ここだけ直せば内容が変わる）
│   └── icons/          # App Store のアプリアイコン
├── _headers            # Cloudflare Pages のレスポンスヘッダ設定
└── robots.txt
```

ビルド不要です。ローカルで確認する場合は `data.json` を fetch する都合上、
ファイルを直接開くのではなく簡易サーバー経由で表示してください。

```sh
python3 -m http.server 8000
# → http://localhost:8000
```

## 内容の更新

掲載作品はすべて `assets/data.json` に入っています。

- `apps` … App Store で公開中のアプリ。`rating` や `ratingCount` は公開時点の値。
- `others` … ストア未公開の制作物。`public: true` のものだけ GitHub リンクを表示します。
- `profile` … 名前・肩書き・リード文・各種リンク。

編集して `git push` すれば、Cloudflare Pages が自動でデプロイします。

## デプロイ（Cloudflare Pages）

GitHub 連携で自動デプロイしています。初回設定は次の通りです。

1. Cloudflare ダッシュボード → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. `gekisoba/my-portfolio` を選択
3. ビルド設定
   - Framework preset: **None**
   - Build command: **（空欄）**
   - Build output directory: **`/`**
4. **Save and Deploy**

以降は `main` へ push するたびに自動でデプロイされます。
