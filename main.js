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

const htm = document.querySelectorAll("section ul > li");
for (let i = 0; i < htm.length; i++) { 
  const art = htm[i];
  const element = document.createElement("h3");
  
  const replace_tag = (text) => {
    const words = ["000users入り"];
    const colors = ["#699dff"];
  
    return words.reduce((acc, word, index) => {
      const color = colors[index % colors.length];
      const regex = new RegExp(word, "g");
      return acc.replace(regex, `<span style='color:${color}; font-size:22px'>${word}</span>`);
    }, String(text));
  };
  
  element.innerHTML = replace_tag(result[i]) || "No tags found";
  Object.assign(element.style, {
    width: 'auto',
    overflowWrap: 'break-word'
  });

  art.appendChild(element);
}

const InsertTag = async (element, popup) => {
  const anchor = element.closest("a");
  const artId = anchor?.getAttribute("data-gtm-value");
  if (artId) {
    popup.innerHTML = `loading: id${artId}`;
    const data = await fetcher.bookmarkdata(artId);
    const count = data.body.bookmarkCount;
    popup.innerHTML = count || 0;
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
      backgroundColor: '#f0f0f0',
      padding: '5px',
      border: '1px solid #ccc',
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
