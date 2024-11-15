class Erectile {
  async pixiv_observer(target,page=1) {
    [target, page] = [String(target), String(page)];
    const response = await fetch(`https://www.pixiv.net/ajax/user/${target}/illusts/bookmarks?tag=&offset=48&limit=48&rest=show&lang=ja`, {
      headers: {"accept": "application/json"},
      referrer: `https://www.pixiv.net/users/${target}/bookmarks/artworks?p=${page}`,
      referrerPolicy: "strict-origin-when-cross-origin",
      method: "GET",
    });
    if (!response.ok) throw new Error(response.status);
    return await response.json();
  }
}

const compileBookmarkSummary = async(uid) => {
  try {
    const erectile = new Erectile();
    let data = await erectile.pixiv_observer(uid);
    const body = data.body;
    if (body) {
      let r18 = 0;
      for (const work of body.works) work.tags.includes("R-18") && r18++;
      const r = (x, ratio = 10) => Math.round(x * ratio) / ratio;
      const result = {
        target: uid,
        body: body,
        total: body.total,
        r18Percentage: r((r18 / body.works.length) * 100),
        r18CountRatioText: `${r18}/${body.works.length}`
      };
      return result;
    }
  } catch (e) { alert(e); }
}
