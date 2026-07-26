# ポートフォリオサイト

Vanilla HTML / CSS / JS の静的サイト。ビルド不要。

- **公開（閲覧用）**: https://kyosuke0306.github.io/portfolio/
- **編集用**: `edit.html` — ローカル専用。公開サイトには含まれない（`_config.yml` で除外）。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `index.html` | 閲覧専用ページ。編集ボタン・編集モーダルなし。GitHub Pages で公開される。 |
| `edit.html` | 編集用ページ。`index.html` に編集モーダルとバナーを足したもの。ローカルでのみ開く。 |
| `app.js` | 両ページ共通。編集UIが無ければ描画だけして終了する（`editorOverlay` の有無で判定）。 |
| `style.css` | 両ページ共通。 |
| `_config.yml` | GitHub Pages（Jekyll）のビルド設定。`edit.html` と `README.md` を公開対象から除外。 |

## 内容を更新する手順

編集内容はブラウザの localStorage に保存されるだけなので、公開サイトに反映するには
`app.js` の `defaultData` に書き戻す必要がある。

1. ローカルサーバーを起動する

   ```bash
   npx --yes serve -l 5500 .
   ```

2. http://localhost:5500/edit.html を開き、「編集」から内容を入力する
3. 編集パネル下部の「JSONを書き出し」で `portfolio-data.json` をダウンロード
4. その内容を `app.js` の `defaultData`（先頭付近）に反映する
5. `index.html` の静的な初期表示（名前・イニシャル・自己紹介・フッター・`<title>`）も揃える
   — JS実行前の一瞬に表示されるため
6. コミットして push すると、1〜2分で公開サイトに反映される

   ```bash
   git add -A && git commit -m "内容を更新" && git push
   ```

## 注意

- 一度でも編集ページを開いたブラウザは localStorage の値を優先して表示する。
  `defaultData` の変更を確認したいときは localStorage をクリアする。
- 画像（アバター・サムネイル）は base64 で JSON に埋め込まれるため、書き出したファイルが
  数MBになることがある。その場合は画像を別ファイルとして持つ方式への変更を検討する。
