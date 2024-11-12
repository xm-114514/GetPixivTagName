# Pixiv Tag Fetcher 拡張機能

Pixiv Tag Fetcherは、Pixivのイラスト作品に関連するタグを簡単に取得するためのクラスを提供するJavaScriptのコードです。指定された作品ID（イラストID）に基づき、PixivのAPIを利用してタグ情報を取得します。

## 機能概要

- **Pixiv APIの利用**：Pixivを通じて、イラストのタグ情報を取得できます。
- **PixivFetcherクラス**：`PixivFetcher`クラスを使用して、イラスト作品のIDを指定するだけでタグ情報をリクエスト可能です。

## 使用方法
1. Pixiv APIの`token`と`version`は、ブラウザの開発者ツール内「ネットワーク」タブから取得してください。
2. **APIトークンとバージョンの設定**：`pixiv.token`と`pixiv.version`の2つの値をPixivのAPI用トークンとバージョンで設定します。
3. **PixivFetcherクラスのインスタンス作成**：`PixivFetcher`クラスのインスタンスを生成し、`fetchTags`メソッドでタグを取得します。
#### Sample
```js
// PixivのトークンとバージョンでPixivFetcherを初期化
const fetcher = new PixivFetcher(pixiv.token, pixiv.version);

// イラストタグを取得 何故かわからんがuid無くても使える
fetcher.fetchTags({ uid: "364364", ids: ["114514"] }).then(tags => {
  console.log(tags);
});

```

### コード構成

```javascript
const pixiv = {
  token: 'OTMxNDM2NDM2NDExNDUxNDkzMTU0NDQ=',
  version: 'ee14d1fa4b6d2b1dd35fd36bf6f3b64b9315b'
};

class PixivFetcher {
  constructor(publicKey, version) {
    this.publicKey = publicKey;
    this.version = version;
    this.userId = this.getUser();
  }
  getUser() {
    return document.cookie.split("; ")
      .find(row => row.includes("user_id="))
      ?.split("=")[1] || window.dataLayer[0]?.user_id || !1;
  }
  genId(len) {
    return Array.from(crypto.getRandomValues(new Uint8Array(len))).map(byte => byte.toString(16).padStart(2,'0')).join('');
  }
  async fetchIllustrations(target, illustIds) {
    if (!this.userId) return !1;
    const trace = this.genId(16);
    const span = this.genId(8);
    const query = Array.isArray(illustIds) ? illustIds.map(id => `ids%5B%5D=${id}`).join('&') : `ids%5B%5D=${illustIds}`;
    try {
      const baggageItems = {
        "sentry-environment": "production",
        "sentry-release": this.version,
        "sentry-public_key": this.publicKey,
        "sentry-trace_id": trace,
        "sentry-sample_rate": "0.0001"
      };
      const baggage = Object.entries(baggageItems).map(([key, value]) => `${key}=${value}`).join(",");
      const response = await fetch(`https://www.pixiv.net/ajax/user/${target}/illusts?${query}&lang=ja&version=${this.version}`, {
        headers: {
          "accept": "application/json",
          "accept-language": "ja,en-US;q=0.9,en;q=0.8",
          "baggage": baggage,
          "priority": "u=1, i",
          "sec-ch-ua": "\"Not?A_Brand\";v=\"99\", \"Chromium\";v=\"130\"",
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": "\"macOS\"","sec-fetch-dest": "empty","sec-fetch-mode": "cors","sec-fetch-site": "same-origin",
          "sentry-trace": `${trace}-${span}-0`,
          "x-user-id": this.userId
        },
        referrer: "https://www.pixiv.net/",
        method: "GET",
        mode: "cors",
        credentials: "include"
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) { console.error('Error fetching illustration data:', error); }
  }
  async fetchTags(params = { uid: "1", ids: [] }) {
    const data = await this.fetchIllustrations(params.uid, params.ids);
    return data ? params.ids.map(id => data.body[id]?.tags).filter(Boolean) : !1;
  }
}
```
