# my-portfolio

個人開発ポートフォリオサイト。素の HTML / CSS / JavaScript のみで構成し、Cloudflare Workers で公開しています。

https://my-portfolio.gekisoba.workers.dev/

## 構成

```
.
├── index.html          # ページ本体（表示するデータは JS で流し込み）
├── assets/
│   ├── style.css       # スタイル（ライト / ダーク両対応）
│   ├── main.js         # data.json を読み込んで描画・絞り込み
│   ├── data.json       # 掲載する作品データ（ここだけ直せば内容が変わる）
│   └── icons/          # App Store のアプリアイコン
├── _headers            # Cloudflare のレスポンスヘッダ設定
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

編集して `git push` すれば、Cloudflare が自動でデプロイします。

## デプロイ

Cloudflare Workers（静的アセット）で公開しています。

- 公開 URL: https://my-portfolio.gekisoba.workers.dev/
- GitHub 連携済みで、`main` へ push すると自動でデプロイされます

## キャッシュ設定について

`_headers` でパスごとに `Cache-Control` を指定しています。

アイコンは内容が変わらないので1年キャッシュ、CSS / JS / データは1時間にしています。
注意点として、`/assets/*` のようなワイルドカードは `/assets/icons/*` にも
重複してマッチし、両方のルールの値が**連結された**ヘッダになってしまいます
（`max-age=3600, must-revalidate, max-age=31536000, immutable` のような形）。
そのため、アイコン以外は個別のパスで指定しています。ファイルを追加したときは
`_headers` にも追記してください。
