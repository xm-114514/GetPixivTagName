# Pixiv Tag Fetcher 拡張機能

Pixiv Tag Fetcherは、Pixivのイラスト作品に関連するタグを簡単に取得するためのクラスを提供するJavaScriptのコードです。指定された作品ID（イラストID）に基づき、PixivのAPIを利用してタグ情報を取得します。

## 機能概要

- **Pixiv APIの利用**：Pixivを通じて、イラストのタグ情報を取得できます。
- **PixivFetcherクラス**：`PixivFetcher`クラスを使用して、イラスト作品のIDを指定するだけでタグ情報をリクエスト可能です。

## 使用方法
1. ~~Pixiv APIの`token`と`version`は、ブラウザの開発者ツール内「ネットワーク」タブから取得してください。~~
2. ~~**APIトークンとバージョンの設定**：`pixiv.token`と`pixiv.version`の2つの値をPixivのAPI用トークンとバージョンで設定します。~~
3. **PixivFetcherクラスのインスタンス作成**：`PixivFetcher`クラスのインスタンスを生成し、`fetchTags`メソッドでタグを取得します。
#### Sample
```js
/**
 * PixivのトークンとバージョンでPixivFetcherを初期化 
 * const fetcher = new PixivFetcher(pixiv.token, pixiv.version); token無くてもリクエストできる
 * uidは何を指定してもok
 * ids: ["114514","931500","3141"] 異なる作者の作品でも一括リクエスト可能
*/
```
```js
const fetcher = new PixivFetcher();
const headers = { uid: "364364", ids: ["114514"] };
const result = await fetcher.fetchTags(headers);
const Format = JSON.stringify(result);
```
### コード構成

```javascript
class PixivFetcher {

  GenId(len) {
    return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async bookmarkdata(Id) {
    const trace = this.GenId(16), span = this.GenId(8);
    try {
      const response = await fetch(`https://www.pixiv.net/ajax/illust/${Id}`, {
        headers: {
          "accept": "application/json",
          "sentry-trace": `${trace}-${span}-0`,
        },
        referrer: `https://www.pixiv.net/artworks/${Id}`, method: "GET",
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {console.error('Error fetching bookmark data:', error);}
  }
  async fetchIllustrations(target, illustIds) {
    const trace = this.GenId(16), span = this.GenId(8);
    const query = Array.isArray(illustIds) ? illustIds.map(id => `ids%5B%5D=${id}`).join('&') : `ids%5B%5D=${illustIds}`;
    try {
      const response = await fetch(`https://www.pixiv.net/ajax/user/${target}/illusts?${query}`, {
        headers: {
          "accept": "application/json",
          "sentry-trace": `${trace}-${span}-0`,
        },
        referrer: "https://www.pixiv.net/", method: "GET",
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) { console.error('Error fetching illustration data:', error); }
  }
  async fetchTags(params = { uid: String(), ids: [] }) {
    const target = params.uid || "1";
    const illustIds = params.ids;
    const li = [];
    if (illustIds.length > 0) {
      const data = await this.fetchIllustrations(target, illustIds);
      if (data) {
        for (const illust of illustIds) {
          const tags = data["body"][illust.toString()]["tags"];
          li.push(tags);
        }
      }
      return li;
    }
  }
}


const Artlist = [];
const ImageAll = document.querySelectorAll("section ul > li a[data-gtm-user-id]");
for (const art of ImageAll) Artlist.push(art.getAttribute("data-gtm-value"));

const fetcher = new PixivFetcher();
const result = await fetcher.fetchTags({ uid: "1", ids: Artlist });
const Format = JSON.stringify(result);
```
