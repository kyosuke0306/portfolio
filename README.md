# ポートフォリオサイト

Vanilla HTML / CSS / JS の静的サイト。ビルド不要。

- **公開（閲覧用）**: https://kyosuke0306.github.io/portfolio/
- **編集用**: `edit.html` — ローカル専用。公開サイトには含まれない（`_config.yml` で除外）。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `data.json` | **表示内容の唯一の情報源。** 閲覧ページも編集ページもこれを読み込む。 |
| `index.html` | 閲覧専用ページ。編集ボタン・編集モーダルなし。GitHub Pages で公開される。 |
| `edit.html` | 編集用ページ。編集モーダルと「公開する」ボタンを持つ。ローカルでのみ開く。 |
| `app.js` | 両ページ共通。編集UIが無ければ描画だけして終了する（`editorOverlay` の有無で判定）。 |
| `style.css` | 両ページ共通。 |
| `_config.yml` | GitHub Pages（Jekyll）のビルド設定。`edit.html` と `README.md` を公開対象から除外。 |

## データの流れ

```
編集ページで入力 → localStorage（下書き） → 「公開する」→ GitHub に data.json をコミット
                                                              ↓
                                            GitHub Pages が再ビルド（1〜2分）
                                                              ↓
                                                  閲覧サイトに反映
```

- 閲覧ページは `data.json` だけを見る。localStorage は一切参照しないので、
  自分のブラウザに古い下書きが残っていても公開内容が正しく表示される。
- 編集ページは下書きがあればそれを優先し、無ければ公開済みの `data.json` から始める。

## 初回セットアップ（GitHub トークン）

「公開する」ボタンを使うには、GitHub のアクセストークンが一度だけ必要。

1. https://github.com/settings/personal-access-tokens/new を開く
2. **Repository access** で `kyosuke0306/portfolio` だけを選ぶ
3. **Permissions → Repository permissions → Contents** を `Read and write` にする（他は不要）
4. 有効期限を設定してトークンを発行し、文字列をコピーする
5. 編集ページの「GitHub アクセストークンを設定」を開いて貼り付け、「トークンを保存」

トークンはこのブラウザの localStorage にのみ保存され、送信先は GitHub API だけ。
`edit.html` は公開サイトに含まれないので、トークンが外部に出ることはない。
期限が切れたら同じ手順で発行し直す。

## 内容を更新する手順

1. ローカルサーバーを起動する

   ```bash
   npx --yes serve -l 5500 .
   ```

2. http://localhost:5500/edit.html を開き、「編集」から内容を入力する
3. 「公開する」を押す
4. 1〜2分後に https://kyosuke0306.github.io/portfolio/ へ反映される

`git pull` すると、公開した `data.json` が手元にも反映される。

「JSONを書き出し / 読み込み」はバックアップや別マシンへの移行用に残してある。

## 注意

- `index.html` の静的な初期表示（名前・自己紹介・`<title>`）は JS 実行前の一瞬と
  検索エンジン向けのもの。名前や肩書きを変えたときは、ここも手で直して push する。
- 画像（アバター・サムネイル）は base64 で `data.json` に埋め込まれる。
  枚数が増えるとファイルが数MBになるので、その場合は画像を別ファイルとして持つ方式への変更を検討する。
- `file://` で直接開くと `data.json` の fetch が CORS で失敗する。必ずローカルサーバー経由で開く。
