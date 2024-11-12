const pixiv = {
  token: 'OTMxNDM2NDM2NDExNDUxNDkzMTU0NDQ=',
  ver: 'ee14d1fa4b6d2b1dd35fd36bf6f3b64b9315b'
};

class PixivFetcher {
  constructor(publicKey, version) {
    this.key = publicKey;
    this.ver = version;
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
        "sentry-release": this.ver,
        "sentry-public_key": this.key,
        "sentry-trace_id": trace,
        "sentry-sample_rate": "0.0001"
      };
      const baggage = Object.entries(baggageItems).map(([key, value]) => `${key}=${value}`).join(",");
      const response = await fetch(`https://www.pixiv.net/ajax/user/${target}/illusts?${query}&lang=ja&version=${this.ver}`, {
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

let global_popup;

const InsertTag = async (element) => {
  const a = element.closest("a");
  const artid = a.getAttribute("data-gtm-value");
  const target = a.getAttribute("data-gtm-user-id");

  if (global_popup && artid) {
    global_popup.innerHTML = `loading: ${target} id${artid}`;
    const fetcher = new PixivFetcher(pixiv.token, pixiv.ver);
    const result = await fetcher.fetchTags({ uid: String(target), ids: [String(artid)] });
    global_popup.innerHTML = result ? JSON.stringify(result).replace(/[\[\]"]/g, "") : "No tags found";
  }
};

document.addEventListener('mouseover', (event) => {
  const target = event.target;
  if (target.tagName === 'IMG') {
    const popup = document.createElement('div');
    popup.className = 'popup';
    Object.assign(popup.style, {
      left: `${target.getBoundingClientRect().left + window.scrollX}px`,
      top: `${target.getBoundingClientRect().top + window.scrollY - 30}px`,
      position: 'absolute',
      backgroundColor: '#f0f0f0',
      padding: '5px',
      border: '1px solid #ccc',
      borderRadius: '5px',
      color: 'black',
      boxShadow: '5px 6px 13px 7px',
      fontSize: '20px'
    });
    
    global_popup = popup;
    document.body.appendChild(popup);

    const shiftKeyHandler = (e) => e.key === 'Shift' && InsertTag(target);
    document.addEventListener('keydown', shiftKeyHandler);
    
    target.addEventListener('mouseout', () => {
      document.removeEventListener('keydown', shiftKeyHandler);
      popup.remove();
    }, { once: true });
  }
});
