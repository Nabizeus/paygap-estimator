// ---------- report: Word (.docx) and print-to-PDF ----------
// Builds one report model, then renders it as a .docx (own minimal writer, no libraries)
// or as a print layout for "Save as PDF".

const LIGHT = {
  w: "#3aa36a", m: "#a06a2a", pos: "#2a78d6", neg: "#e34948", good: "#0a8f0a", bad: "#d03b3b",
  grid: "#e1e0d9", axis: "#c3c2b7", muted: "#898781", ink: "#0b0b0b", ink2: "#52514e",
  surface: "#ffffff", page: "#ffffff", hover: "#f3f2ee",
  s1: "#2a78d6", s2: "#eb6834", s3: "#1baf7a", s4: "#eda100", s5: "#e87ba4", s6: "#008300", s7: "#6250d6", s8: "#e34948"
};
const REPORT_W = 640; // chart width in px

// --- turn an on-screen chart into a PNG (light colours, fixed fonts) ---
function svgToPng(svg, scale = 2) {
  let src = svg.outerHTML
    .replace(/var\(--([a-z0-9]+)\)/g, (m, k) => LIGHT[k] || "#888")
    .replace(/ data-tip="[^"]*"/g, "")
    .replace(/&nbsp;/g, "&#160;"); // HTML entity is not valid in an SVG image
  if (!/xmlns=/.test(src)) src = src.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  const vb = svg.getAttribute("viewBox").split(/\s+/).map(Number), w = vb[2], h = vb[3];
  src = src.replace(/<svg([^>]*)>/, (m, a) => `<svg${a.replace(/\s(width|height)="[^"]*"/g, "")} width="${w}" height="${h}"><style>text{fill:${LIGHT.muted};font-family:Arial,Helvetica,sans-serif;font-size:11px}.lbl{fill:${LIGHT.ink2};font-size:12px}</style><rect width="100%" height="100%" fill="#ffffff"/>`);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      const ctx = c.getContext("2d"); ctx.scale(scale, scale); ctx.drawImage(img, 0, 0, w, h);
      const dataUrl = c.toDataURL("image/png");
      const bin = atob(dataUrl.split(",")[1]), bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      resolve({ dataUrl, bytes, w, h });
    };
    img.onerror = reject;
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(src);
  });
}
// render a chart function off-screen at report width and return its PNG
async function chartImage(fn, ...args) {
  const host = document.createElement("div");
  host.style.cssText = `position:absolute;left:-10000px;top:0;width:${REPORT_W}px`;
  document.body.appendChild(host);
  try { fn(host, ...args); const svg = host.querySelector("svg"); return svg ? await svgToPng(svg) : null; }
  finally { host.remove(); }
}
// heatmap as SVG (the on-screen one is HTML)
function heatSvg(el, items) {
  const n = state.levels.length, W = REPORT_W, lab = 170, cw = (W - lab) / n, rh = 34, T = 22, H = T + rh * items.length + 4;
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%">`;
  state.levels.forEach((l, i) => s += `<text x="${lab + cw * i + cw / 2}" y="14" text-anchor="middle">${esc(l.name.replace(/^\S+\s+(?=[IVX]+$)/, ""))}</text>`);
  items.forEach(({ name, r }, j) => {
    const y = T + rh * j;
    s += `<text class="lbl" x="0" y="${y + rh / 2}">${esc(name.length > 26 ? name.slice(0, 25) + "…" : name)}</text>`;
    r.levels.forEach((l, i) => {
      const x = lab + cw * i;
      let fill = LIGHT.hover, tc = LIGHT.muted, txt = "–";
      if (l.share_diff != null) {
        const pp = l.share_diff * 100, a = Math.abs(pp), rd = Math.round(pp), sig = l.label === "HiSig" || l.label === "Sig";
        txt = (rd > 0 ? "+" : rd < 0 ? "−" : "") + Math.abs(rd);
        if (sig && a >= 0.5) {
          const alpha = a < 10 ? 0.3 : a < 25 ? 0.6 : 0.95, base = pp > 0 ? LIGHT.pos : LIGHT.neg;
          fill = mix(base, alpha); tc = alpha > 0.5 ? "#ffffff" : LIGHT.ink;
        }
      }
      s += `<rect x="${x + 1.5}" y="${y + 1.5}" width="${cw - 3}" height="${rh - 3}" rx="4" fill="${fill}"/><text x="${x + cw / 2}" y="${y + rh / 2 + 4}" text-anchor="middle" style="fill:${tc};font-size:12px">${txt}</text>`;
    });
  });
  el.innerHTML = s + "</svg>";
}
function mix(hex, a) { // blend a colour with white
  const n = parseInt(hex.slice(1), 16), c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.round(255 + (v - 255) * a));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}
function pipelineOnly(el, items) { chartPipeline(el, items); const lg = el.querySelector(".legend"); if (lg) lg.remove(); }

// --- HTML (from the app's own text) to report paragraphs ---
function htmlToBlocks(html) {
  const d = document.createElement("div"); d.innerHTML = html;
  const out = [];
  const runs = node => {
    const rs = [];
    node.childNodes.forEach(c => {
      if (c.nodeType === 3) rs.push({ text: c.textContent });
      else if (c.tagName === "STRONG" || c.tagName === "B") rs.push({ text: c.textContent, b: true });
      else if (c.tagName === "EM" || c.tagName === "I") rs.push({ text: c.textContent, i: true });
      else if (c.tagName === "A") rs.push({ text: c.textContent }, { text: " (" + c.getAttribute("href") + ")", color: LIGHT.ink2 });
      else if (c.tagName === "SUB") rs.push({ text: c.textContent });
      else rs.push(...runs(c));
    });
    return rs;
  };
  d.childNodes.forEach(c => {
    if (c.nodeType !== 1) return;
    if (c.tagName === "H3") out.push({ t: "h3", text: c.textContent });
    else if (c.tagName === "P") out.push({ t: "p", runs: runs(c), cls: c.className });
    else if (c.tagName === "OL" || c.tagName === "UL") [...c.children].forEach((li, i) =>
      out.push({ t: "p", runs: [{ text: (c.tagName === "OL" ? (i + 1) + ". " : "• ") }, ...runs(li)], indent: true }));
  });
  return out;
}

// --- the report model ---
async function buildReport(onStep) {
  const date = new Date().toLocaleDateString(loc(), { year: "numeric", month: "long", day: "numeric" });
  const rs = state.depts.map(d => ({ name: d.name, d, r: analyzeDept(d) })).filter(x => !x.r.error);
  const B = [];
  const lgWM = { t: "legend", items: [{ text: tr("women"), color: LIGHT.w }, { text: tr("men"), color: LIGHT.m }] };
  const sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "") + pct(Math.abs(v), 1);
  const lab = l => tr("lab_" + l);

  B.push({ t: "title", text: tr("rep_title") + (state.org ? " · " + state.org : "") + (state.year ? " · " + state.year : "") });
  B.push({ t: "p", runs: [{ text: tr("rep_generated", { d: date }), color: LIGHT.ink2 }] });
  B.push({ t: "p", runs: [{ text: tr("rep_settings") + ": ", b: true },
    { text: `${tr("dist")}: ${tr(state.distribution === "uniform" ? "dist_uni_s" : "dist_tri_s")} · ${tr("ref")}: ${tr(state.reference === "men" ? "ref_men" : "ref_mean")} · ${tr("thresholds")}: ${state.thresholds.map(t => pct(t, 1)).join(" / ")}` }] });

  // summary
  B.push({ t: "h1", text: tr("rep_summary") });
  B.push({ t: "table", align: "lrrrlrrrl",
    head: [tr("dept"), tr("women"), tr("men"), tr("t_mean"), "", tr("t_total"), tr("eu_mean"), tr("eu_median"), tr("eu_th")],
    rows: rs.map(({ name, r }) => [name, num(r.women), num(r.men), sgn(r.mean.rel), lab(r.mean.label), sgn(r.total.rel),
      sgn(r.eu.mean_gap), sgn(r.eu.median_gap), r.eu.above_threshold ? "⚠ " + tr("eu_above") : "✓ " + tr("eu_below")]) });
  rs.forEach(({ name, r }) => {
    const d = document.createElement("div"); d.innerHTML = verdictHTML(r);
    const first = d.querySelector("p");
    if (first) B.push({ t: "p", runs: [{ text: name + ": ", b: true }, ...htmlToBlocks(first.outerHTML)[0].runs] });
  });

  if (rs.length > 1) {
    onStep && onStep();
    B.push({ t: "h2", text: tr("ch_pipe") });
    B.push({ t: "p", runs: [{ text: tr("ch_pipe_d"), color: LIGHT.ink2 }] });
    B.push({ t: "legend", items: rs.slice(0, 8).map((x, k) => ({ text: x.name, color: LIGHT["s" + (k + 1)] })) });
    B.push({ t: "img", ...(await chartImage(pipelineOnly, rs)) });
    B.push({ t: "h2", text: tr("ch_heat") });
    B.push({ t: "p", runs: [{ text: tr("ch_heat_d"), color: LIGHT.ink2 }] });
    B.push({ t: "legend", items: [{ text: tr("heat_over"), color: LIGHT.pos }, { text: tr("heat_under"), color: LIGHT.neg }, { text: tr("heat_ns"), color: "#d3d1c7" }] });
    B.push({ t: "img", ...(await chartImage(heatSvg, rs)) });
  }

  // one section per department
  for (const { name, d, r } of rs) {
    onStep && onStep();
    B.push({ t: "pagebreak" });
    B.push({ t: "h1", text: name });
    const vd = document.createElement("div"); vd.innerHTML = verdictHTML(r);
    htmlToBlocks(vd.innerHTML).forEach(b => B.push(b.cls === "note" ? { ...b, note: true } : b));
    B.push({ t: "h2", text: tr("rep_key") });
    B.push({ t: "table", align: "lrrrl",
      head: ["", tr("women"), tr("men"), tr("gap"), tr("conf")],
      rows: [
        [tr("t_mean"), money(r.mean.women), money(r.mean.men), sgn(r.mean.rel), conf(r.mean.confidence) + " · " + lab(r.mean.label)],
        [tr("t_total"), money(r.total.women), money(r.total.men), sgn(r.total.rel), conf(r.total.confidence) + " · " + lab(r.total.label)],
        [tr("t_ratio"), "", "", sgn(r.ratio.excess), conf(r.ratio.confidence) + " · " + lab(r.ratio.label)],
        [tr("eu_mean"), money(r.mean.women), money(r.mean.men), sgn(r.eu.mean_gap), r.eu.above_threshold ? "⚠ " + tr("eu_above") : "✓ " + tr("eu_below")],
        [tr("eu_median"), money(r.eu.median_women), money(r.eu.median_men), sgn(r.eu.median_gap), ""]] });
    B.push({ t: "h2", text: tr("ch_pyramid") }, lgWM, { t: "img", ...(await chartImage(chartPyramid, r)) });
    B.push({ t: "h2", text: tr("ch_contrib") });
    B.push({ t: "p", runs: [{ text: tr("ch_contrib_d", { gap: money(r.mean.diff) }), color: LIGHT.ink2 }] });
    B.push({ t: "legend", items: [{ text: tr("contrib_up"), color: LIGHT.pos }, { text: tr("contrib_down"), color: LIGHT.neg }] });
    B.push({ t: "img", ...(await chartImage(chartContrib, r)) });
    B.push({ t: "h2", text: tr("eu_quart") }, lgWM, { t: "img", ...(await chartImage(quartOnly, r)) });
    B.push({ t: "h2", text: tr("per_level") });
    B.push({ t: "table", align: "lrrrrrrll",
      head: [tr("level"), tr("women"), tr("men"), tr("pay_pp"), tr("w_share"), tr("vs_all"), tr("conf"), tr("women_are"), ""],
      rows: r.levels.map(l => [l.level, num(l.women), num(l.men), money(l.midpoint), l.share_women == null ? "–" : pct(l.share_women, 1),
        ppTxt(l.share_diff), conf(l.confidence), repTxt(l), lab(l.label)]) });
    const warns = staffWarnings(d);
    warns.forEach(w => B.push({ t: "p", runs: [{ text: "⚠ " + w, color: "#6b4a00" }] }));
  }

  // method
  B.push({ t: "pagebreak" });
  B.push({ t: "h1", text: tr("method_title") });
  htmlToBlocks(tr("method_html")).forEach(b => B.push(b));
  return B;
}
function quartOnly(el, r) { euCard(el, r); const svg = el.querySelector("#chQuart svg"); el.innerHTML = ""; if (svg) el.appendChild(svg); }

// --- .docx writer ---
const xe = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
function crc32(buf) {
  let t = crc32.t;
  if (!t) { t = crc32.t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } }
  let c = 0xFFFFFFFF; for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function zipStore(files) { // files: [{name, data:Uint8Array}] -> Uint8Array (no compression)
  const enc = new TextEncoder(), parts = [], central = [];
  let off = 0;
  const u16 = v => [v & 255, (v >> 8) & 255], u32 = v => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  for (const f of files) {
    const name = enc.encode(f.name), crc = crc32(f.data), sz = f.data.length;
    const head = [...u32(0x04034b50), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(sz), ...u32(sz), ...u16(name.length), ...u16(0)];
    parts.push(new Uint8Array(head), name, f.data);
    central.push(new Uint8Array([...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0x0800), ...u16(0), ...u16(0), ...u16(0x21), ...u32(crc), ...u32(sz), ...u32(sz), ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(off)]), name);
    off += head.length + name.length + sz;
  }
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const end = new Uint8Array([...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length), ...u32(cdSize), ...u32(off), ...u16(0)]);
  const all = [...parts, ...central, end], out = new Uint8Array(all.reduce((a, b) => a + b.length, 0));
  let p = 0; all.forEach(a => { out.set(a, p); p += a.length; });
  return out;
}
function toDocx(blocks) {
  const enc = new TextEncoder(), media = [];
  const run = r => `<w:r><w:rPr>${r.b ? "<w:b/>" : ""}${r.i ? "<w:i/>" : ""}${r.color ? `<w:color w:val="${r.color.slice(1)}"/>` : ""}${r.size ? `<w:sz w:val="${r.size}"/>` : ""}</w:rPr><w:t xml:space="preserve">${xe(r.text)}</w:t></w:r>`;
  const para = (runs, style, extra = "") => `<w:p><w:pPr>${style ? `<w:pStyle w:val="${style}"/>` : ""}${extra}</w:pPr>${runs.map(run).join("")}</w:p>`;
  let body = "";
  blocks.forEach((b, k) => { const nx = blocks[k + 1] || {}; b.keep = (b.t === "legend") || (b.t === "p" && (nx.t === "legend" || nx.t === "img")); });
  for (const b of blocks) {
    if (b.t === "title") body += para([{ text: b.text }], "Title");
    else if (b.t === "h1") body += para([{ text: b.text }], "Heading1");
    else if (b.t === "h2") body += para([{ text: b.text }], "Heading2");
    else if (b.t === "h3") body += para([{ text: b.text }], "Heading3");
    else if (b.t === "p") body += para(b.runs, null, (b.keep ? "<w:keepNext/>" : "") + (b.indent ? '<w:ind w:left="360"/>' : "") + (b.note ? '<w:pBdr><w:left w:val="single" w:sz="18" w:space="8" w:color="C3C2B7"/></w:pBdr><w:ind w:left="200"/>' : ""));
    else if (b.t === "legend") body += para(b.items.flatMap(it => [{ text: "■ ", color: it.color, size: 22 }, { text: it.text + "     ", color: LIGHT.ink2, size: 18 }]), null, '<w:keepNext/><w:spacing w:after="40"/>');
    else if (b.t === "pagebreak") body += '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    else if (b.t === "img" && b.bytes) {
      const id = media.length + 1; media.push(b.bytes);
      const cx = Math.round(Math.min(b.w, 600) * 9525), cy = Math.round(cx * b.h / b.w);
      body += `<w:p><w:pPr><w:spacing w:after="160"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="${cx}" cy="${cy}"/><wp:docPr id="${id}" name="Chart ${id}"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="${id}" name="chart${id}.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rIdImg${id}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>`;
    } else if (b.t === "table") {
      const cols = b.head.length, total = 9638;
      const wt = b.head.map((h, i) => Math.min(24, Math.max(7.5, ...[h, ...b.rows.map(r => r[i])].map(c => Math.max(...String(c ?? "").split(/\s+/).map(x => x.length)) * 0.6 + String(c ?? "").length * 0.4))));
      const sum = wt.reduce((a, c) => a + c, 0), widths = wt.map(x => Math.floor(total * x / sum));
      const cell = (txt, i, head) => `<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="F1EFE8"/>' : ""}</w:tcPr><w:p><w:pPr><w:spacing w:before="40" w:after="40"/>${b.align && b.align[i] === "r" ? '<w:jc w:val="right"/>' : ""}</w:pPr>${run({ text: txt, b: head, size: 17, color: head ? LIGHT.ink2 : null })}</w:p></w:tc>`;
      body += `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="D3D1C7"/><w:bottom w:val="single" w:sz="4" w:color="D3D1C7"/><w:insideH w:val="single" w:sz="4" w:color="E1E0D9"/></w:tblBorders><w:tblCellMar><w:left w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${widths.map(w => `<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`
        + `<w:tr><w:trPr><w:tblHeader/></w:trPr>${b.head.map((h, i) => cell(h, i, true)).join("")}</w:tr>`
        + b.rows.map(r => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c, i) => cell(c, i, false)).join("")}</w:tr>`).join("") + `</w:tbl>` + para([{ text: "" }]);
    }
  }
  const doc = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri" w:eastAsia="Calibri"/><w:sz w:val="21"/><w:color w:val="0B0B0B"/><w:lang w:val="${xe(loc())}"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="80"/></w:pPr><w:rPr><w:b/><w:sz w:val="40"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:sz w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:sz w:val="25"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="60"/><w:outlineLvl w:val="2"/></w:pPr><w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:style>
</w:styles>`;
  const types = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>`;
  const docRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>${media.map((_, i) => `<Relationship Id="rIdImg${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/chart${i + 1}.png"/>`).join("")}</Relationships>`;
  const core = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xe(blocks[0] ? blocks[0].text : tr("rep_title"))}</dc:title><dc:creator>${xe(tr("app_title"))}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`;
  return zipStore([
    { name: "[Content_Types].xml", data: enc.encode(types) },
    { name: "_rels/.rels", data: enc.encode(rels) },
    { name: "docProps/core.xml", data: enc.encode(core) },
    { name: "word/document.xml", data: enc.encode(doc) },
    { name: "word/styles.xml", data: enc.encode(styles) },
    { name: "word/_rels/document.xml.rels", data: enc.encode(docRels) },
    ...media.map((m, i) => ({ name: `word/media/chart${i + 1}.png`, data: m }))]);
}

// --- print layout (Save as PDF) ---
function toPrintHTML(blocks) {
  // keep each heading together with the chart or table that follows it
  const out = []; let grp = null;
  const flush = () => { if (grp) { out.push(`<section class="rg">${grp.join("\n")}</section>`); grp = null; } };
  blocks.forEach(b => {
    const h = blockHTML(b);
    if (b.t === "h2") { flush(); grp = [h]; return; }
    if (grp) { grp.push(h); if (b.t === "img" || b.t === "table") flush(); return; }
    out.push(h);
  });
  flush();
  return out.join("\n");
}
function blockHTML(b) {
  const run = r => { const t = esc(r.text); const st = r.color ? ` style="color:${r.color}"` : ""; return r.b ? `<strong${st}>${t}</strong>` : r.i ? `<em${st}>${t}</em>` : st ? `<span${st}>${t}</span>` : t; };
  {
    if (b.t === "title") return `<h1 class="rt">${esc(b.text)}</h1>`;
    if (b.t === "h1") return `<h2 class="r1">${esc(b.text)}</h2>`;
    if (b.t === "h2") return `<h3 class="r2">${esc(b.text)}</h3>`;
    if (b.t === "h3") return `<h4 class="r3">${esc(b.text)}</h4>`;
    if (b.t === "p") return `<p class="${b.indent ? "ri" : ""}${b.note ? " rn" : ""}">${b.runs.map(run).join("")}</p>`;
    if (b.t === "legend") return `<p class="rl">${b.items.map(it => `<span><i style="background:${it.color}"></i>${esc(it.text)}</span>`).join("")}</p>`;
    if (b.t === "pagebreak") return `<div class="rpb"></div>`;
    if (b.t === "img") return b.dataUrl ? `<img class="rimg" src="${b.dataUrl}" style="width:${Math.min(b.w, 640)}px">` : "";
    if (b.t === "table") return `<table class="rtab"><thead><tr>${b.head.map((h, i) => `<th class="${b.align && b.align[i] === "r" ? "n" : ""}">${esc(h)}</th>`).join("")}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map((c, i) => `<td class="${b.align && b.align[i] === "r" ? "n" : ""}">${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    return "";
  }
}

// --- saving a file (Claude page: downloads capability; elsewhere: normal download) ---
async function saveFile(name, bytes, type) {
  if (FRAMED && window.claude && window.claude.use) {
    const dl = await window.claude.use("downloads");
    if (!dl) throw new Error("unavailable");
    await dl.save({ filename: name, data: bytes });
    return;
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([bytes], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
const reportName = ext => ((tr("rep_file") + "-" + (state.org || "") + "-" + (state.year || "")).replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "report") + "." + ext;

async function downloadDocx(btn, status) {
  btn.disabled = true; status.textContent = tr("rep_making");
  try {
    const blocks = await buildReport();
    await saveFile(reportName("docx"), toDocx(blocks), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    status.textContent = "";
  } catch (e) { status.textContent = e && e.code === "declined" ? "" : tr("rep_fail"); console.error(e); }
  btn.disabled = false;
}
async function printPdf(btn, status) {
  btn.disabled = true; status.textContent = tr("rep_making");
  try {
    const blocks = await buildReport();
    let root = document.getElementById("print-root");
    if (!root) { root = document.createElement("div"); root.id = "print-root"; document.body.appendChild(root); }
    root.innerHTML = toPrintHTML(blocks);
    const imgs = [...root.querySelectorAll("img")];
    await Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    status.textContent = tr("rep_pdf_hint");
    const old = document.title; document.title = reportName("pdf").replace(/\.pdf$/, "");
    window.print();
    document.title = old;
  } catch (e) { status.textContent = tr("rep_fail"); console.error(e); }
  btn.disabled = false;
}
function reportButtons(el) {
  el.innerHTML = `<span class="muted" style="font-size:13px">${esc(tr("rep_btn"))}:</span>
    ${FRAMED ? "" : `<button class="b" data-r="pdf">PDF</button>`}
    <button class="b" data-r="docx">Word (.docx)</button>
    <span class="muted" style="font-size:12px" data-r="st"></span>`;
  const st = el.querySelector("[data-r=st]");
  const p = el.querySelector("[data-r=pdf]"); if (p) p.onclick = () => printPdf(p, st);
  const d = el.querySelector("[data-r=docx]"); d.onclick = () => downloadDocx(d, st);
  canDownload().then(ok => { d.hidden = !ok; });
}
