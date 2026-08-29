# my-portfolio

個人開発ポートフォリオサイト。素の HTML / CSS / JavaScript のみで構成し、Cloudflare Workers で公開しています。

https://gekisoba.com/

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

## アプリ紹介ページ（LP）

ビジネス系アプリには個別の紹介ページとプライバシーポリシーを用意しています。

| アプリ | 紹介ページ | プライバシーポリシー |
|---|---|---|
| 訪問ログ | `/apps/homon-log/` | `/apps/homon-log/privacy/` |
| 図書貸出管理 | `/apps/library/` | `/apps/library/privacy/` |
| AppRank | `/apps/apprank/` | `/apps/apprank/privacy/` |
| 上記以外の12本 | （なし） | `/privacy/`（共通・アプリ別の対応表つき） |

各ページは素の HTML で、`assets/style.css`（配色・ベース）と `assets/lp.css`
（LP 専用）を読み込んでいます。スクリーンショットは App Store のものを
`assets/screenshots/<slug>/` に保存しています。

### 新しい LP を追加する

1. `apps/<slug>/` を既存のフォルダからコピーして中身を書き換える
2. スクリーンショットを `assets/screenshots/<slug>/` に置く
3. `assets/data.json` の該当アプリに `"lp": "apps/<slug>/"` を設定する
   （カードに「詳しく見る」ボタンが出ます。`update-data.py` はこの値を保持します）

**プライバシーポリシーは実装を確認してから書くこと。** 広告 SDK の有無、
外部 API への送信内容、カメラや位置情報の用途はアプリごとに違います。

## サポート・プライバシーポリシー

| ページ | URL | App Store Connect での用途 |
|---|---|---|
| サポート | `/support/` | サポート URL（12本共通） |
| プライバシーポリシー | `/privacy/` | プライバシーポリシー URL（12本共通） |
| 各 LP | `/apps/<slug>/` | マーケティング URL・サポート URL（該当3本） |
| 各 LP のポリシー | `/apps/<slug>/privacy/` | プライバシーポリシー URL（該当3本） |

**App Store Connect の反映タイミング**（画面の記載より）

> アプリの名前、カテゴリ、またはプライバシーポリシーを変更する場合は、
> 新規アプリバージョンを作成してください。その他すべての変更は即座に反映されます。

- サポート URL / マーケティング URL … 即時反映
- プライバシーポリシー URL … 新バージョンが必要


## アプリ内プロモーションの配信

各アプリの「新作リリース！」ポップアップの内容を `config/promo.json` から配信しています。
**ここを書き換えるだけで、アプリのアップデートなしに全アプリの宣伝内容が変わります。**

配信先: https://gekisoba.com/config/promo.json （キャッシュなし＝即反映）

### 構造

- `featured` … 今いちばん推したいアプリ。1本だけ出すタイプのポップアップ（無限コイン落としなど）が使う
  - `dialogues` … クリッカーカンパニーの井上さんのセリフ。**推しアプリの内容に合わせて書き直す**
- `apps` … 一覧表示用。表示側が自分の `bundleId` を除外する。先頭から順に並ぶ

### 新作を出したときにやること

1. `featured` を新作に差し替える
2. `featured.dialogues` を新作の内容に合わせて書き直す
3. `apps` の先頭に新作を追加する
4. `_redirects` に短縮リンクを1行足す
5. push すれば全アプリに反映される

リンクは短縮リンク（`gekisoba.com/<slug>`）経由にしてあるので、
行き先の変更が効きますし、Web Analytics で流入も測れます。

## 内容の更新

掲載作品はすべて `assets/data.json` に入っています。

- `apps` … App Store で公開中のアプリ
- `retired` … 過去に公開していて現在は配信を終了したアプリ
- `others` … ストアに出していない試作・自作ツール。`public: true` のものだけ GitHub リンクを表示します
- `profile` … 名前・肩書き・リード文・各種リンク

編集して `git push` すれば、Cloudflare が自動でデプロイします。

### App Store の情報は自動更新されます

評価・レビュー数・新しく公開したアプリは、GitHub Actions が**毎週月曜 9:00（JST）**に
取得して、変化があれば自動でコミットします（`.github/workflows/update-app-data.yml`）。
変化がなければ何もしません。

すぐ反映したいときは手動でも実行できます。

```sh
python3 tools/update-data.py
git add -A && git commit -m "アプリデータを更新" && git push
```

GitHub の Actions タブから手動実行することもできます。

**説明文（`desc`）とタグ（`tags`）は手書きなので、更新スクリプトは上書きしません。**
新しいアプリが見つかった場合はこの2つが空のまま追加され、実行時に警告が出ます。
`assets/data.json` を開いて埋めてください。

App Store から消えたアプリは、`retired`（過去に公開していたアプリ）へ自動で移動します。
リンクだけ外し、説明文とタグは実績として残します。`period` の表記だけ後から直してください。

## デプロイ

Cloudflare Workers（静的アセット）で公開しています。

- 公開 URL: https://gekisoba.com/
- GitHub 連携済みで、`main` へ push すると自動でデプロイされます

## キャッシュ設定について（重要）

`index.html` は常に最新が配信されます。そのため CSS / JS / data.json をブラウザに
キャッシュさせると、**新しい HTML × 古い JS** という食い違いが起きて、
UI は表示されるのに動かない、という状態になります（実際に一度やらかしました）。

対策として2段構えにしています。

1. `_headers` で CSS / JS / data.json を `no-cache` に指定
   保存はするが毎回サーバーに確認する。変更なしなら 304 が返るだけなので軽い。
2. `index.html` 側で `?v=2` のバージョン付き URL を指定
   既にキャッシュを持っているブラウザを強制的に切り替えるための保険。
   通常は 1 の設定で足りるので、日常的に触る必要はない。

アイコンだけは同名で内容が変わらないため、1年キャッシュ（`immutable`）にしています。

なお `_headers` のワイルドカードは重複マッチに注意してください。`/assets/*` と
`/assets/icons/*` の両方を書くと、アイコンには**両方のルールが連結された**
Cache-Control が返り、意図しない値が効きます。そのためアイコン以外は個別パスで
指定しています。assets にファイルを追加したときは `_headers` にも追記してください。
