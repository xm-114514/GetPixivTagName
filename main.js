class PixivFetcher {
  GenId(len) {
    return Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  generateSentryTrace() {
    return `${this.GenId(16)}-${this.GenId(8)}-0`;
  }
  getHeaders(trace, span) {
    return {
      "accept": "application/json",
      "sentry-trace": `${trace}-${span}-0`,
    };
  }
  async bookmarkdata(Id) {
    try {
      const response = await fetch(`https://www.pixiv.net/ajax/illust/${Id}`, {
        headers: this.getHeaders(this.GenId(16), this.GenId(8)),
        referrer: `https://www.pixiv.net/artworks/${Id}`,
        method: "GET",
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching bookmark data:', error);
      throw error;
    }
  }
  async fetchIllustrations(target, illustIds) {
    const query = Array.isArray(illustIds) ? illustIds.map(id => `ids%5B%5D=${id}`).join('&') : `ids%5B%5D=${illustIds}`;
    try {
      const response = await fetch(`https://www.pixiv.net/ajax/user/${target}/illusts?${query}`, {
        headers: this.getHeaders(this.GenId(16), this.GenId(8)),
        referrer: "https://www.pixiv.net/",
        method: "GET",
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (e) { throw e; }
  }
  async fetchTags(params = { uid: '1', ids: [] }) {
    console.log("fetch tag:", params);
    const { uid, ids: illustIds } = params;
    if (!illustIds.length) return [];
    try {
      const data = await this.fetchIllustrations(uid, illustIds);
      const li = [];
      if (data) {
        const body = data.body;
        illustIds.forEach(id => li.push(body[id.toString()]?.tags || []));
      }
      return li;
    } catch (error) { return []; }
  }
}

const words = ["000users入り","R-18"];
const removeTags = ['虚偽users入りタグ','スカトロ','リョナ', 'AI生成', 'AIイラスト'];
const colors = ["#699dff", "red"];

const fetcher = new PixivFetcher();

const updateElements = async () => {
  const Artlist = [];
  const section = document.querySelectorAll("section ul > li a[data-gtm-user-id]");

  for (const art of section) {
    const parentLi = art.closest("li");
    if (parentLi && !parentLi.hasAttribute("aria-label")) {
      Artlist.push(art.getAttribute("data-gtm-value"));
    }
  }
  if (Artlist.length === 0) return;
  const result = await fetcher.fetchTags({ uid: "1", ids: Artlist });

  for (let i = 0; i < section.length; i++) {
    const art = section[i].closest("li");
    if (art.hasAttribute("aria-label")) continue;
    const replace_tag = (text) => {
      for (const tag of removeTags) {
        if (text && text.includes(tag)) {
          art.remove();
          return false;
        }
      }
      return words.reduce((acc, word, index) => {
        const color = colors[index % colors.length] || "red";
        const regex = new RegExp(word, "g");
        return acc.replace(regex, `<span style='color:${color}; font-size:22px'>${word}</span>`);
      }, String(text));
    };
    const first = result.shift();
    const tagText = replace_tag(first) || "No tags found";
    art.setAttribute("aria-label", tagText);
    const element = document.createElement("h3");
    element.innerHTML = tagText;
    Object.assign(element.style, {
      width: 'auto',
      overflowWrap: 'break-word'
    });
    art.appendChild(element);
  }
};
setInterval(updateElements, 1500);



const InsertTag = async (element, popup) => {
  const anchor = element.closest("a");
  const artId = anchor?.getAttribute("data-gtm-value");
  if (artId) {
    popup.innerHTML = `loading: id${artId}`;
    const data = await fetcher.bookmarkdata(artId);
    const count = data.body.bookmarkCount || 0;
    const levels = [
      { value: 10000, fs: '45px', color: 'red', ts: '2px 2px 0 gold, -2px 2px 0 gold, 2px -2px 0 gold, -2px -2px 0 gold' },
      { value: 5000, fs: '39px', color: 'pink', ts: '2px 2px 0 black, -2px 2px 0 black, 2px -2px 0 black, -2px -2px 0 black' },
      { value: 4000, fs: '38px', color: 'orange', ts: '2px 2px 0 black, -2px 2px 0 black, 2px -2px 0 black, -2px -2px 0 black' },
      { value: 2000, fs: '37px', color: 'yellow', ts: '2px 2px 0 black, -2px 2px 0 black, 2px -2px 0 black, -2px -2px 0 black' },
      { value: 1000, fs: '35px', color: '#699dff', ts: '2px 2px 0 black, -2px 2px 0 black, 2px -2px 0 black, -2px -2px 0 black' },
      { value: 0, fs: '30px', color: '#ffffff', ts: 'none' } 
    ];
    const getStyleByLevel = count => levels.find(level => count >= level.value) || levels[levels.length - 1];
    const style = getStyleByLevel(count);
    const spanHtml = `
      <span style="font-size:${style.fs};color:${style.color};text-shadow:${style.ts};">
        ${count}
      </span>`;
    popup.innerHTML = spanHtml;
  }
};

document.addEventListener('mouseover', (event) => {
  const target = event.target;

  if (target.tagName === 'IMG') {
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerHTML = '';
    Object.assign(popup.style, {
      left: `${target.getBoundingClientRect().left + window.scrollX}px`,
      top: `${target.getBoundingClientRect().top + window.scrollY - 30}px`,
      position: 'absolute',
      backgroundColor: "rgb(47 47 47 / 50%)",
      padding: '5px',
      borderRadius: '5px',
      color: 'black',
      boxShadow: '5px 6px 13px 7px',
      fontSize: '20px'
    });
    document.body.appendChild(popup);

    const handleShiftKey = (e) => e.key === 'Shift' && InsertTag(target, popup);
    document.addEventListener('keydown', handleShiftKey);
    target.addEventListener('mouseout', () => {
      document.removeEventListener('keydown', handleShiftKey);
      popup.remove();
    }, { once: true });
  }
});
