(() => {
const STORE = "paygap-estimator-v1";
const FRAMED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- state ----------
function example() {
  const lang = state ? state.lang : detectLang(), T = I18N[lang];
  const dn = x => T.ex_dept.replace("{x}", x);
  return {
    v: 1, lang,
    org: T.ex_company, year: new Date().getFullYear(), currency: "EUR",
    distribution: "triangular", reference: "mean", thresholds: [0.99, 0.95, 0.90],
    levels: [
      { name: "R1", min: 18522, max: 25189, mid: 21856 },
      { name: "R2", min: 27522, max: 45622, mid: 36572 },
      { name: "R3", min: 39677, max: 63250, mid: 51464 },
      { name: "R4", min: 55000, max: 88555, mid: 71778 }],
    depts: [
      { name: dn("A"), w: [4, 8, 0, 0], m: [3, 8, 3, 2] },
      { name: dn("B"), w: [4, 8, 1, 0], m: [15, 15, 5, 2] },
      { name: dn("C"), w: [21, 37, 7, 1], m: [41, 37, 16, 7] }],
    active: 0
  };
}
function blank() {
  return { v: 1, lang: state.lang, org: "", year: new Date().getFullYear(), currency: "EUR",
    distribution: "triangular", reference: "mean", thresholds: [0.99, 0.95, 0.90],
    levels: [{ name: "1", min: "", max: "", mid: "" }, { name: "2", min: "", max: "", mid: "" }, { name: "3", min: "", max: "", mid: "" }],
    depts: [{ name: tr("new_dept"), w: [0, 0, 0], m: [0, 0, 0] }], active: 0 };
}
function detectLang() {
  const l = (navigator.language || "en").toLowerCase();
  return l.startsWith("ca") ? "ca" : l.startsWith("es") ? "es" : l.startsWith("de") ? "de" : "en";
}
let state = null;
try { const s = JSON.parse(localStorage.getItem(STORE)); if (valid(s)) state = s; } catch (e) {}
if (!state) state = example();
else {
  const ren = { CVC: "A", CES: "B", "Earth Science": "C" };
  state.depts.forEach(d => { if (ren[d.name]) d.name = I18N[state.lang || "en"].ex_dept.replace("{x}", ren[d.name]); });
  if (state.org === "Example") state.org = I18N[state.lang || "en"].ex_company;
}
function valid(s) { return s && Array.isArray(s.levels) && Array.isArray(s.depts) && s.depts.every(d => Array.isArray(d.w) && Array.isArray(d.m)); }
function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) {} }
function normalize() {
  const n = state.levels.length;
  state.depts.forEach(d => { while (d.w.length < n) d.w.push(0); while (d.m.length < n) d.m.push(0); d.w.length = n; d.m.length = n; });
  if (!(state.active >= 0 && state.active < state.depts.length)) state.active = 0;
}
normalize();

// ---------- i18n & formatting ----------
const tr = (k, vars) => {
  let s = (I18N[state.lang] && I18N[state.lang][k]) ?? I18N.en[k] ?? k;
  if (vars) for (const [a, b] of Object.entries(vars)) s = s.split("{" + a + "}").join(b);
  return s;
};
const loc = () => I18N[state.lang].locale;
const money = v => {
  if (v == null || !isFinite(v)) return "–";
  try { return new Intl.NumberFormat(loc(), { style: "currency", currency: state.currency || "EUR", maximumFractionDigits: 0 }).format(v); }
  catch (e) { return new Intl.NumberFormat(loc(), { maximumFractionDigits: 0 }).format(v) + " " + (state.currency || ""); }
};
const num = (v, d = 0) => v == null || !isFinite(v) ? "–" : new Intl.NumberFormat(loc(), { maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
const pct = (v, d = 1) => v == null || !isFinite(v) ? "–" : new Intl.NumberFormat(loc(), { style: "percent", maximumFractionDigits: d, minimumFractionDigits: d }).format(v);
const conf = c => {
  if (c == null || !isFinite(c)) return "–";
  if (c >= 0.9999) return ">" + pct(0.9999, 2);
  // truncate (never round up across a threshold, e.g. 98.996% -> 98.99%)
  const d = c >= 0.9 ? 2 : 1, f = Math.pow(10, d + 2);
  return pct(Math.floor(c * f) / f, d);
};
const badge = l => `<span class="badge ${l === "n/a" ? "na" : l}">${esc(tr("lab_" + l))}</span>`;
const opts = () => ({ distribution: state.distribution, reference: state.reference, thresholds: state.thresholds });
const analyzeDept = d => PayGap.analyze(state.levels, d.w, d.m, opts());

// ---------- routing ----------
const TABS = ["setup", "bands", "staff", "results", "method"];
const current = () => { const h = location.hash.slice(1); return TABS.includes(h) ? h : "results"; };
window.addEventListener("hashchange", render);

// ---------- render ----------
function render() {
  document.documentElement.lang = state.lang;
  document.title = tr("app_title");
  const tab = current();
  $("#app").innerHTML = `
  <header class="top">
    <div><h1>${esc(tr("app_title"))}</h1><p class="sub">${esc(tr("app_sub"))}</p></div>
    <div class="lang" role="group" aria-label="${esc(tr("language"))}">
      ${["en", "es", "ca", "de"].map(l => `<button data-lang="${l}" aria-pressed="${state.lang === l}">${{ en: "English", es: "Español", ca: "Català", de: "Deutsch" }[l]}</button>`).join("")}
    </div>
  </header>
  <nav class="tabs">${TABS.map(t => `<a href="#${t}" ${t === tab ? 'aria-current="page"' : ""}>${esc(tr("tab_" + t))}</a>`).join("")}</nav>
  <main id="view"></main>
  <p class="foot">${esc(tr("data_note"))}</p>`;
  ({ setup: viewSetup, bands: viewBands, staff: viewStaff, results: viewResults, method: viewMethod })[tab]($("#view"));
}

document.addEventListener("click", e => {
  const l = e.target.closest("[data-lang]");
  if (l) { relabelExample(l.dataset.lang); state.lang = l.dataset.lang; save(); render(); }
});

// Keep untouched example names in the chosen language
function relabelExample(to) {
  const langs = Object.keys(I18N), T = I18N[to];
  if (langs.some(l => I18N[l].ex_company === state.org)) state.org = T.ex_company;
  state.depts.forEach(d => {
    for (const l of langs) {
      const m = d.name.match(new RegExp("^" + I18N[l].ex_dept.replace("{x}", "([A-Z])") + "$"));
      if (m) { d.name = T.ex_dept.replace("{x}", m[1]); break; }
    }
  });
}

// ---------- 1. setup ----------
function viewSetup(v) {
  v.innerHTML = `
  <section class="card"><h2>${esc(tr("setup_title"))}</h2>
    <div class="grid2">
      <label class="f">${esc(tr("org"))}<input id="org" value="${esc(state.org)}"></label>
      <label class="f">${esc(tr("year"))}<input id="year" type="number" value="${esc(state.year)}"></label>
      <label class="f">${esc(tr("currency"))}<select id="cur">${["EUR", "USD", "GBP", "CHF", "SEK", "NOK", "DKK", "PLN", "CZK", "JPY", "CAD", "AUD", "MXN", "BRL", "ARS", "CLP", "COP"].map(c => `<option ${c === state.currency ? "selected" : ""}>${c}</option>`).join("")}</select></label>
    </div>
    <div class="grid2" style="margin-top:18px">
      <fieldset><legend>${esc(tr("dist"))}</legend>
        <label class="radio"><input type="radio" name="dist" value="triangular" ${state.distribution === "triangular" ? "checked" : ""}><span>${esc(tr("dist_tri"))}</span></label>
        <label class="radio"><input type="radio" name="dist" value="uniform" ${state.distribution === "uniform" ? "checked" : ""}><span>${esc(tr("dist_uni"))}</span></label>
      </fieldset>
      <fieldset><legend>${esc(tr("ref"))}</legend>
        <label class="radio"><input type="radio" name="ref" value="mean" ${state.reference === "mean" ? "checked" : ""}><span>${esc(tr("ref_mean"))}</span></label>
        <label class="radio"><input type="radio" name="ref" value="men" ${state.reference === "men" ? "checked" : ""}><span>${esc(tr("ref_men"))}</span></label>
      </fieldset>
    </div>
    <fieldset style="margin-top:18px"><legend>${esc(tr("thresholds"))}</legend>
      <div class="row">
        ${["th_hi", "th_sig", "th_mid"].map((k, i) => `<label class="f" style="flex-direction:row;align-items:center;gap:8px">${esc(tr(k))}
          <input type="number" class="th" data-i="${i}" min="50" max="99.99" step="0.5" style="width:84px" value="${+(state.thresholds[i] * 100).toFixed(2)}"> %</label>`).join("")}
      </div>
    </fieldset>
  </section>
  <section class="card"><h2>${esc(tr("data_title"))}</h2><p class="help">${esc(tr("data_note"))}</p>
    <div class="row">
      <button class="b" id="ex">${esc(tr("load_example"))}</button>
      <button class="b" id="bl">${esc(tr("start_blank"))}</button>
      <button class="b" id="exp">${esc(tr("export"))}</button>
      <button class="b" id="imp">${esc(tr("import"))}</button>
    </div>
  </section>`;
  $("#org").oninput = e => { state.org = e.target.value; save(); };
  $("#year").oninput = e => { state.year = e.target.value; save(); };
  $("#cur").onchange = e => { state.currency = e.target.value; save(); };
  v.querySelectorAll("input[name=dist]").forEach(r => r.onchange = () => { state.distribution = r.value; save(); });
  v.querySelectorAll("input[name=ref]").forEach(r => r.onchange = () => { state.reference = r.value; save(); });
  v.querySelectorAll("input.th").forEach(inp => inp.oninput = () => {
    const x = parseFloat(inp.value) / 100;
    const ok = x > 0.5 && x < 1;
    inp.classList.toggle("bad", !ok);
    if (ok) { state.thresholds[+inp.dataset.i] = x; save(); }
  });
  $("#ex").onclick = () => confirmBox(() => { state = example(); normalize(); save(); render(); });
  $("#bl").onclick = () => confirmBox(() => { state = blank(); normalize(); save(); location.hash = "bands"; render(); });
  $("#exp").onclick = exportBox;
  $("#imp").onclick = importBox;
}

// ---------- 2. bands ----------
function bandProblems() {
  const p = {};
  state.levels.forEach((l, i) => {
    if (l.min !== "" && l.max !== "" && +l.max <= +l.min) p[i] = tr("err_minmax");
    else if (i > 0 && l.min !== "" && state.levels[i - 1].min !== "" && +l.min < +state.levels[i - 1].min) p[i] = tr("err_order");
  });
  return p;
}
function viewBands(v) {
  v.innerHTML = `
  <section class="card"><h2>${esc(tr("bands_title"))}</h2><p class="help">${esc(tr("bands_help"))}</p>
    <div class="tbl-scroll"><table class="edit">
      <thead><tr><th>${esc(tr("level"))}</th><th class="n">${esc(tr("min"))}</th><th class="n">${esc(tr("max"))}</th><th class="n">${esc(tr("midpoint"))}</th><th class="n">${esc(tr("width"))}</th><th></th></tr></thead>
      <tbody>${state.levels.map((l, i) => `<tr data-i="${i}">
        <td><input data-k="name" value="${esc(l.name)}" style="min-width:70px" aria-label="${esc(tr("level"))}"></td>
        <td><input data-k="min" type="number" min="0" value="${esc(l.min)}" aria-label="${esc(tr("min"))}"></td>
        <td><input data-k="max" type="number" min="0" value="${esc(l.max)}" aria-label="${esc(tr("max"))}"></td>
        <td><input data-k="mid" type="number" min="0" value="${esc(l.mid ?? "")}" placeholder="${esc(tr("auto"))}: ${l.min !== "" && l.max !== "" ? num((+l.min + +l.max) / 2) : ""}" aria-label="${esc(tr("midpoint"))}"></td>
        <td class="n w">${l.min !== "" && l.max !== "" ? num(+l.max - +l.min) : "–"}</td>
        <td><button class="link danger" data-del="${i}" ${state.levels.length <= 1 ? "disabled" : ""}>${esc(tr("remove"))}</button></td>
      </tr>`).join("")}</tbody></table></div>
    <div id="bandwarn"></div>
    <div class="row" style="margin-top:10px"><button class="b" id="add">${esc(tr("add_level"))}</button></div>
  </section>
  <section class="card"><h2>${esc(tr("paste_title"))}</h2><p class="help">${esc(tr("paste_help"))}</p>
    <textarea id="paste" rows="5" style="width:100%" placeholder="R1&#9;18522&#9;25189&#10;R2&#9;27522&#9;45622"></textarea>
    <div class="row" style="margin-top:8px"><button class="b primary" id="doPaste">${esc(tr("apply"))}</button></div>
  </section>`;
  const warn = () => {
    const p = bandProblems();
    v.querySelectorAll("tbody tr").forEach(tr_ => {
      const i = +tr_.dataset.i, bad = !!p[i];
      tr_.querySelector("[data-k=max]").classList.toggle("bad", bad);
    });
    $("#bandwarn").innerHTML = Object.entries(p).map(([i, m]) => `<div class="warn">${esc(state.levels[i].name)}: ${esc(m)}</div>`).join("");
  };
  warn();
  v.querySelectorAll("tbody input").forEach(inp => inp.oninput = () => {
    const i = +inp.closest("tr").dataset.i, k = inp.dataset.k;
    const l = state.levels[i];
    l[k] = k === "name" ? inp.value : (inp.value === "" ? "" : +inp.value);
    if (k === "mid" && inp.value === "") l.mid = "";
    const row = inp.closest("tr");
    row.querySelector(".w").textContent = l.min !== "" && l.max !== "" ? num(+l.max - +l.min) : "–";
    row.querySelector("[data-k=mid]").placeholder = tr("auto") + ": " + (l.min !== "" && l.max !== "" ? num((+l.min + +l.max) / 2) : "");
    save(); warn();
  });
  v.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    const i = +b.dataset.del;
    state.levels.splice(i, 1);
    state.depts.forEach(d => { d.w.splice(i, 1); d.m.splice(i, 1); });
    save(); render();
  });
  $("#add").onclick = () => {
    const last = state.levels[state.levels.length - 1];
    state.levels.push({ name: String(state.levels.length + 1), min: last && last.max !== "" ? last.max : "", max: "", mid: "" });
    normalize(); save(); render();
  };
  $("#doPaste").onclick = () => {
    const rows = $("#paste").value.split(/\r?\n/).map(r => r.split(/\t|;|,(?=\s*\d)/).map(c => c.trim())).filter(r => r.length >= 3);
    const parseN = s => { s = s.replace(/[^\d.,-]/g, ""); if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, "").replace(",", "."); else s = s.replace(/[.,](?=\d{3}(\D|$))/g, ""); return parseFloat(s); };
    const lv = rows.map(r => ({ name: r[0], min: parseN(r[1]), max: parseN(r[2]), mid: r[3] ? parseN(r[3]) : "" }))
      .filter(l => isFinite(l.min) && isFinite(l.max));
    if (!lv.length) return;
    lv.forEach(l => { if (!isFinite(l.mid)) l.mid = ""; });
    state.levels = lv; normalize(); save(); render();
  };
}

// ---------- 3. staff ----------
function deptChips(onPick, withAll) {
  return `<div class="chip-row" role="group">${state.depts.map((d, i) => `<button class="chip" data-dept="${i}" aria-pressed="${state.active === i}">${esc(d.name)}</button>`).join("")}
  ${withAll ? `<button class="chip" data-dept="all" aria-pressed="${state.active === "all"}">${esc(tr("all"))}</button>` : ""}</div>`;
}
function staffWarnings(d) {
  const out = [];
  const W = tr("women").toLowerCase(), M = tr("men").toLowerCase();
  state.levels.forEach((l, i) => {
    const w = +d.w[i] || 0, m = +d.m[i] || 0;
    if (w + m === 0) return;
    if (w > 0 && w < 5) out.push(tr("w_small", { level: l.name, who: W }));
    if (m > 0 && m < 5) out.push(tr("w_small", { level: l.name, who: M }));
  });
  const tw = d.w.reduce((a, b) => a + (+b || 0), 0), tm = d.m.reduce((a, b) => a + (+b || 0), 0);
  if (!tw || !tm) out.unshift(tr("w_empty"));
  return out;
}
function viewStaff(v) {
  if (state.active === "all") state.active = 0;
  const d = state.depts[state.active];
  v.innerHTML = `
  <section class="card"><h2>${esc(tr("staff_title"))}</h2><p class="help">${esc(tr("staff_help"))}</p>
    ${deptChips()}
    <div class="row" style="margin-bottom:12px">
      <label class="f" style="flex-direction:row;align-items:center;gap:8px">${esc(tr("dept"))} <input id="dname" value="${esc(d.name)}"></label>
      <button class="b" id="addD">${esc(tr("add_dept"))}</button>
      <button class="link" id="dupD">${esc(tr("duplicate"))}</button>
      <button class="link danger" id="delD" ${state.depts.length <= 1 ? "disabled" : ""}>${esc(tr("delete"))}</button>
    </div>
    <div class="tbl-scroll"><table class="edit">
      <thead><tr><th>${esc(tr("level"))}</th><th class="n">${esc(tr("midpoint"))}</th><th class="n" style="color:var(--w)">${esc(tr("women"))}</th><th class="n" style="color:var(--m)">${esc(tr("men"))}</th><th class="n">${esc(tr("total"))}</th></tr></thead>
      <tbody>${state.levels.map((l, i) => `<tr data-i="${i}">
        <td>${esc(l.name)}</td><td class="n muted">${money(PayGap.mid(l))}</td>
        <td><input type="number" min="0" step="1" data-g="w" value="${esc(d.w[i])}" aria-label="${esc(tr("women") + " " + l.name)}"></td>
        <td><input type="number" min="0" step="1" data-g="m" value="${esc(d.m[i])}" aria-label="${esc(tr("men") + " " + l.name)}"></td>
        <td class="n t">${num((+d.w[i] || 0) + (+d.m[i] || 0))}</td></tr>`).join("")}
      </tbody>
      <tfoot><tr><th>${esc(tr("total"))}</th><th></th><th class="n" id="tw"></th><th class="n" id="tm"></th><th class="n" id="tt"></th></tr></tfoot>
    </table></div>
    <div id="sw"></div>
    <div class="row" style="margin-top:12px"><a class="b primary" href="#results" style="text-decoration:none;padding:7px 12px;border-radius:8px">${esc(tr("tab_results"))} →</a></div>
  </section>`;
  const refresh = () => {
    const tw = d.w.reduce((a, b) => a + (+b || 0), 0), tm = d.m.reduce((a, b) => a + (+b || 0), 0);
    $("#tw").textContent = num(tw); $("#tm").textContent = num(tm); $("#tt").textContent = num(tw + tm);
    $("#sw").innerHTML = staffWarnings(d).map(w => `<div class="warn">${esc(w)}</div>`).join("");
  };
  refresh();
  v.querySelectorAll("tbody input").forEach(inp => inp.oninput = () => {
    const i = +inp.closest("tr").dataset.i;
    const x = Math.max(0, Math.round(+inp.value || 0));
    d[inp.dataset.g][i] = x;
    inp.closest("tr").querySelector(".t").textContent = num((+d.w[i] || 0) + (+d.m[i] || 0));
    save(); refresh();
  });
  $("#dname").oninput = e => { d.name = e.target.value; save(); const c = v.querySelector(`[data-dept="${state.active}"]`); if (c) c.textContent = d.name; };
  $("#addD").onclick = () => { state.depts.push({ name: tr("new_dept"), w: state.levels.map(() => 0), m: state.levels.map(() => 0) }); state.active = state.depts.length - 1; save(); render(); };
  $("#dupD").onclick = () => { state.depts.push({ name: tr("copy_of", { name: d.name }), w: [...d.w], m: [...d.m] }); state.active = state.depts.length - 1; save(); render(); };
  $("#delD").onclick = () => confirmBox(() => { state.depts.splice(state.active, 1); state.active = 0; save(); render(); }, tr("delete") + " “" + d.name + "”?", tr("delete"));
  v.querySelectorAll("[data-dept]").forEach(b => b.onclick = () => { state.active = +b.dataset.dept; save(); render(); });
}

// ---------- 4. results ----------
let scenario = null; // {dept index, w, m}
function viewResults(v) {
  const bp = bandProblems();
  const missing = state.levels.some(l => l.min === "" || l.max === "");
  if (missing || Object.keys(bp).length) {
    v.innerHTML = `<section class="card"><div class="warn">${esc(tr("bands_title"))}: ${esc(Object.values(bp)[0] || tr("bands_help"))}</div><a href="#bands">${esc(tr("tab_bands"))} →</a></section>`;
    return;
  }
  v.innerHTML = `<section class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(tr("results_title"))}${state.org ? " · " + esc(state.org) : ""}${state.year ? " · " + esc(state.year) : ""}</h2></div>
    <div style="margin-top:10px">${deptChips(null, state.depts.length > 1)}</div></section><div id="res"></div>`;
  v.querySelectorAll("[data-dept]").forEach(b => b.onclick = () => { state.active = b.dataset.dept === "all" ? "all" : +b.dataset.dept; scenario = null; save(); render(); });
  if (state.active === "all") renderAll($("#res")); else renderDept($("#res"), state.active);
}

function verdictHTML(r) {
  const m = r.mean, parts = [];
  if (Math.abs(m.diff) < 0.5) parts.push(tr("v_equal"));
  else parts.push(tr(m.diff < 0 ? "v_lower" : "v_higher", { pct: pct(Math.abs(m.rel)) }));
  if (m.label === "HiSig" || m.label === "Sig") parts.push(tr("v_sig", { label: tr("lab_" + m.label), conf: conf(m.confidence) }));
  else if (m.label === "MidSig") parts.push(tr("v_mid", { conf: conf(m.confidence) }));
  else if (m.label === "NotSig") parts.push(tr("v_not", { conf: conf(m.confidence) }));
  let html = `<p><strong>${esc(parts[0])}</strong> ${esc(parts.slice(1).join(" "))}</p>`;
  // significant under/over-representation by level
  const sig = l => l.label === "HiSig" || l.label === "Sig";
  const list = rep => r.levels.filter(l => sig(l) && l.representation === rep).map(l => `${l.level} (${pct(l.share_women, 0)})`).join(", ");
  const under = list("under"), over = list("over");
  const reps = [];
  if (under) reps.push(tr("v_under", { levels: under }));
  if (over) reps.push(tr("v_over", { levels: over }));
  if (reps.length) html += `<p>${esc(tr("v_rep_intro", { a: pct(r.women / (r.women + r.men), 0) }))} ${esc(reps.join(" "))}</p>`;
  if (r.men !== r.women && Math.abs(r.total.rel) > Math.abs(m.rel) + 0.02) html += `<p class="help" style="margin:0">${esc(tr("v_total", { pct: pct(Math.abs(r.total.rel)), r: num(Math.max(r.men, r.women) / Math.min(r.men, r.women), 1) }))}</p>`;
  return html;
}
function favours(diff, lbl) { return lbl === "n/a" ? "–" : Math.abs(diff) < 0.5 ? tr("fav_parity") : tr(diff > 0 ? "fav_women" : "fav_men"); }
function testCard(title, desc, big, sub, t, extra) {
  return `<div class="card test" style="margin:0"><h3>${esc(title)}</h3><p class="d">${esc(desc)}</p>
    <div class="row" style="justify-content:space-between;align-items:flex-end"><div><div class="big num">${big}</div><div class="help" style="margin:2px 0 0">${sub}</div></div>${badge(t.label)}</div>
    <dl class="kv">${extra}<dt>${esc(tr("conf"))}</dt><dd>${conf(t.confidence)}</dd><dt>${esc(tr("tscore"))} · ${esc(tr("dof"))}</dt><dd>${num(t.t, 2)} · ${num(t.dof)}</dd></dl></div>`;
}
function renderDept(el, idx) {
  const d = state.depts[idx], r = analyzeDept(d);
  if (r.error) { el.innerHTML = `<section class="card"><div class="warn">${esc(tr("w_empty"))}</div><a href="#staff">${esc(tr("tab_staff"))} →</a></section>`; return; }
  const warns = staffWarnings(d);
  const gapTxt = t => (t.rel > 0 ? "+" : "") + pct(t.rel);
  el.innerHTML = `
  <section class="card verdict"><h2>${esc(tr("verdict"))} · ${esc(d.name)}</h2>${verdictHTML(r)}</section>
  <div class="tests" style="margin-bottom:16px">
    ${testCard(tr("t_mean"), tr("t_mean_d"), gapTxt(r.mean), `${esc(tr("women"))} ${money(r.mean.women)} · ${esc(tr("men"))} ${money(r.mean.men)}`, r.mean,
      `<dt>${esc(tr("gap"))}</dt><dd>${money(r.mean.diff)} ± ${money(r.mean.error)}</dd><dt>${esc(tr("favours"))}</dt><dd>${esc(favours(r.mean.diff, r.mean.label))}</dd>`)}
    ${testCard(tr("t_total"), tr("t_total_d"), gapTxt(r.total), `${esc(tr("women"))} ${money(r.total.women)} · ${esc(tr("men"))} ${money(r.total.men)}`, r.total,
      `<dt>${esc(tr("gap"))}</dt><dd>${money(r.total.diff)} ± ${money(r.total.error)}</dd><dt>${esc(tr("favours"))}</dt><dd>${esc(favours(r.total.diff, r.total.label))}</dd>`)}
    ${testCard(tr("t_ratio"), tr("t_ratio_d"), (r.ratio.excess > 0 ? "+" : "") + pct(r.ratio.excess), `${esc(tr("excess"))}`, r.ratio,
      `<dt>${esc(tr("head_ratio"))}</dt><dd>${num(r.ratio.headcount_ratio, 2)}</dd><dt>${esc(tr("pay_ratio"))}</dt><dd>${num(r.ratio.pay_ratio, 2)} ± ${num(r.ratio.error, 2)}</dd>`)}
  </div>
  <section class="card"><div class="charts">
    <div><h3 style="margin-top:0">${esc(tr("ch_head"))}</h3><div class="legend"><span style="--c:var(--w)">${esc(tr("women"))}</span><span style="--c:var(--m)">${esc(tr("men"))}</span></div><div id="chHead"></div></div>
    <div><h3 style="margin-top:0">${esc(tr("ch_mean"))}</h3><div class="legend"><span style="--c:var(--w)">${esc(tr("women"))}</span><span style="--c:var(--m)">${esc(tr("men"))}</span></div><div id="chMean"></div></div>
  </div></section>
  <section class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(tr("per_level"))}</h2><span class="row" id="lvlBtns"></span></div>
    <p class="help">${esc(tr("per_level_d", { p: pct(r.women / (r.women + r.men), 1) }))}</p>
    <div class="tbl-scroll"><table id="lvlTbl"><thead><tr><th>${esc(tr("level"))}</th><th class="n">${esc(tr("women"))}</th><th class="n">${esc(tr("men"))}</th><th class="n">${esc(tr("pay_pp"))}</th><th class="n">${esc(tr("w_share"))}</th><th class="n">${esc(tr("vs_all"))}</th><th class="n">${esc(tr("conf"))}</th><th>${esc(tr("women_are"))}</th><th></th></tr></thead>
    <tbody>${r.levels.map(l => `<tr><td>${esc(l.level)}</td><td class="n">${num(l.women)}</td><td class="n">${num(l.men)}</td><td class="n">${money(l.midpoint)}</td><td class="n">${l.share_women == null ? "–" : pct(l.share_women, 1)}</td><td class="n">${ppTxt(l.share_diff)}</td><td class="n">${conf(l.confidence)}</td><td>${esc(repTxt(l))}</td><td>${badge(l.label)}</td></tr>`).join("")}</tbody></table></div>
    ${warns.length ? warns.map(w => `<div class="warn">${esc(w)}</div>`).join("") : ""}
  </section>
  <section class="card whatif" id="whatif"></section>`;
  chartHeadcount($("#chHead"), r);
  chartMeans($("#chMean"), [{ name: d.name, r }]);
  tableButtons($("#lvlBtns"), () => tsvLevels(d, r), (d.name || "department") + "-levels.csv");
  renderWhatIf($("#whatif"), idx);
}

function renderAll(el) {
  const rs = state.depts.map(d => ({ name: d.name, r: analyzeDept(d) })).filter(x => !x.r.error);
  el.innerHTML = `
  <section class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(tr("compare_title"))}</h2><span class="row" id="allBtns"></span></div>
    <div class="tbl-scroll" style="margin-top:10px"><table><thead>
      <tr><th>${esc(tr("dept"))}</th><th class="n">${esc(tr("women"))}</th><th class="n">${esc(tr("men"))}</th>
      <th class="n">${esc(tr("t_mean"))}</th><th></th><th class="n">${esc(tr("t_total"))}</th><th></th><th class="n">${esc(tr("excess"))}</th><th></th></tr></thead>
      <tbody>${rs.map(({ name, r }) => `<tr><td>${esc(name)}</td><td class="n">${num(r.women)}</td><td class="n">${num(r.men)}</td>
        <td class="n">${pct(r.mean.rel)}</td><td>${badge(r.mean.label)}</td>
        <td class="n">${pct(r.total.rel)}</td><td>${badge(r.total.label)}</td>
        <td class="n">${pct(r.ratio.excess)}</td><td>${badge(r.ratio.label)}</td></tr>`).join("")}</tbody></table></div>
  </section>
  <section class="card"><h3 style="margin-top:0">${esc(tr("ch_mean"))}</h3><div class="legend"><span style="--c:var(--w)">${esc(tr("women"))}</span><span style="--c:var(--m)">${esc(tr("men"))}</span></div><div id="chAll"></div></section>`;
  chartMeans($("#chAll"), rs);
  tableButtons($("#allBtns"), () => tsvAll(rs), "departments.csv");
}

// ---------- what-if ----------
function renderWhatIf(el, idx) {
  const d = state.depts[idx];
  if (!scenario || scenario.idx !== idx) scenario = { idx, w: [...d.w], m: [...d.m] };
  const base = analyzeDept(d);
  const draw = () => {
    const s = PayGap.analyze(state.levels, scenario.w, scenario.m, opts());
    const block = (title, r) => r.error ? `<div><div class="help">${esc(title)}</div>–</div>` :
      `<div class="card" style="margin:0;padding:12px 14px"><div class="help" style="margin:0">${esc(title)} · ${esc(tr("t_mean"))}</div><div class="big num">${(r.mean.rel > 0 ? "+" : "") + pct(r.mean.rel)}</div><div style="margin-top:6px">${badge(r.mean.label)} <span class="help">${conf(r.mean.confidence)}</span></div></div>`;
    $("#wiCmp").innerHTML = block(tr("baseline"), base) + block(tr("scenario"), s);
    el.querySelectorAll("[data-wi]").forEach(inp => {
      const [g, i] = inp.dataset.wi.split(":"); const delta = scenario[g][+i] - (+d[g][+i] || 0);
      inp.closest("td").querySelector(".delta").textContent = delta ? (delta > 0 ? "+" : "") + delta : "";
    });
  };
  const stepper = (g, i) => `<span class="stepper"><button data-st="${g}:${i}:-1" aria-label="−">−</button><input type="number" min="0" data-wi="${g}:${i}" value="${scenario[g][i]}" aria-label="${esc(tr(g === "w" ? "women" : "men") + " " + state.levels[i].name)}"><button data-st="${g}:${i}:1" aria-label="+">+</button></span><span class="delta"></span>`;
  el.innerHTML = `<h2>${esc(tr("whatif"))}</h2><p class="help">${esc(tr("whatif_d"))}</p>
    <div class="cmp" id="wiCmp"></div>
    <div class="tbl-scroll"><table><thead><tr><th>${esc(tr("level"))}</th><th>${esc(tr("women"))}</th><th>${esc(tr("men"))}</th></tr></thead>
    <tbody>${state.levels.map((l, i) => `<tr><td>${esc(l.name)}</td><td>${stepper("w", i)}</td><td>${stepper("m", i)}</td></tr>`).join("")}</tbody></table></div>
    <div class="row" style="margin-top:12px"><button class="b" id="wiReset">${esc(tr("reset"))}</button><button class="b" id="wiApply">${esc(tr("apply_dept"))}</button><button class="b primary" id="wiNew">${esc(tr("save_new"))}</button></div>`;
  el.querySelectorAll("[data-wi]").forEach(inp => inp.oninput = () => { const [g, i] = inp.dataset.wi.split(":"); scenario[g][+i] = Math.max(0, Math.round(+inp.value || 0)); draw(); });
  el.querySelectorAll("[data-st]").forEach(b => b.onclick = () => {
    const [g, i, s] = b.dataset.st.split(":"); scenario[g][+i] = Math.max(0, scenario[g][+i] + +s);
    el.querySelector(`[data-wi="${g}:${i}"]`).value = scenario[g][+i]; draw();
  });
  $("#wiReset").onclick = () => { scenario = null; renderWhatIf(el, idx); };
  $("#wiApply").onclick = () => { d.w = [...scenario.w]; d.m = [...scenario.m]; scenario = null; save(); render(); };
  $("#wiNew").onclick = () => { state.depts.push({ name: tr("scenario_name", { name: d.name }), w: [...scenario.w], m: [...scenario.m] }); state.active = state.depts.length - 1; scenario = null; save(); render(); };
  draw();
}

// ---------- charts ----------
const tip = (() => { const t = document.createElement("div"); t.className = "tip"; document.body.appendChild(t); return t; })();
function bindTips(svg) {
  svg.querySelectorAll("[data-tip]").forEach(n => {
    n.addEventListener("pointermove", e => { tip.innerHTML = n.dataset.tip; tip.style.display = "block";
      const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8); tip.style.left = x + "px"; tip.style.top = (e.clientY + 14) + "px"; });
    n.addEventListener("pointerleave", () => tip.style.display = "none");
  });
}
function niceMax(v) { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
function chartHeadcount(el, r) {
  const W = Math.max(300, Math.round(el.clientWidth) || 460), H = 240, R = 8, T = 10, B = 26;
  const max = niceMax(Math.max(1, ...r.levels.map(l => Math.max(l.women, l.men))));
  const L = 14 + 7 * num(max).length;
  const n = r.levels.length, gw = (W - L - R) / n, bw = Math.min(26, gw * 0.32);
  const y = v => T + (H - T - B) * (1 - v / max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * max);
  const bar = (x, v, c, who, l) => { const h = (H - T - B) - (y(v) - T); const rr = Math.min(4, h / 2, bw / 2);
    const tipTxt = `<b>${esc(l.level)}</b><br>${esc(who)}: ${num(v)}`;
    return `<g data-tip="${esc(tipTxt)}"><rect x="${x - 4}" y="${T}" width="${bw + 8}" height="${H - T - B}" fill="transparent"/>${v > 0 ? `<path d="M${x},${H - B} V${y(v) + rr} q0,-${rr} ${rr},-${rr} H${x + bw - rr} q${rr},0 ${rr},${rr} V${H - B} Z" fill="${c}"/>` : ""}</g>`; };
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tr("ch_head"))}">`;
  ticks.forEach(v => { if (!Number.isInteger(v)) return; s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${num(v)}</text>`; });
  r.levels.forEach((l, i) => {
    const cx = L + gw * i + gw / 2;
    s += bar(cx - bw - 1, l.women, "var(--w)", tr("women"), l) + bar(cx + 1, l.men, "var(--m)", tr("men"), l);
    s += `<text class="lbl" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(l.level)}</text>`;
  });
  s += `<line x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}" stroke="var(--axis)"/></svg>`;
  el.innerHTML = s; bindTips(el.querySelector("svg"));
}
function chartMeans(el, items) {
  const rowH = items.length === 1 ? 80 : 46, W = Math.max(300, Math.round(el.clientWidth) || 460), L = 110, R = 16, T = 8, B = 26, H = T + B + rowH * items.length;
  let lo = Infinity, hi = -Infinity;
  items.forEach(({ r }) => { [["women", "err_women"], ["men", "err_men"]].forEach(([a, e]) => { lo = Math.min(lo, r.mean[a] - r.mean[e]); hi = Math.max(hi, r.mean[a] + r.mean[e]); }); });
  const pad = (hi - lo) * 0.1 || 1000; lo = Math.max(0, lo - pad); hi = hi + pad;
  const step = niceMax((hi - lo) / 5);
  lo = Math.floor(lo / step) * step; hi = Math.ceil(hi / step) * step;
  const x = v => L + (W - L - R) * (v - lo) / (hi - lo);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tr("ch_mean"))}">`;
  for (let v = lo; v <= hi + 1e-6; v += step) s += `<line x1="${x(v)}" x2="${x(v)}" y1="${T}" y2="${H - B}" stroke="var(--grid)"/><text x="${x(v)}" y="${H - 8}" text-anchor="middle">${new Intl.NumberFormat(loc(), { notation: "compact", maximumFractionDigits: 1 }).format(v)}</text>`;
  items.forEach(({ name, r }, i) => {
    const cy = T + rowH * i + rowH / 2;
    s += `<text class="lbl" x="${L - 10}" y="${cy + 4}" text-anchor="end">${esc(name.length > 15 ? name.slice(0, 14) + "…" : name)}</text>`;
    [["women", "err_women", "var(--w)", -7], ["men", "err_men", "var(--m)", 7]].forEach(([a, e, c, dy]) => {
      const v = r.mean[a], er = r.mean[e], yy = cy + dy;
      const t_ = `<b>${esc(name)} · ${esc(tr(a))}</b><br>${money(v)} ± ${money(er)}`;
      s += `<g data-tip="${esc(t_)}"><rect x="${L}" y="${yy - 7}" width="${W - L - R}" height="14" fill="transparent"/>
        <line x1="${x(v - er)}" x2="${x(v + er)}" y1="${yy}" y2="${yy}" stroke="${c}" stroke-width="2"/>
        <line x1="${x(v - er)}" x2="${x(v - er)}" y1="${yy - 4}" y2="${yy + 4}" stroke="${c}" stroke-width="2"/>
        <line x1="${x(v + er)}" x2="${x(v + er)}" y1="${yy - 4}" y2="${yy + 4}" stroke="${c}" stroke-width="2"/>
        <circle cx="${x(v)}" cy="${yy}" r="5" fill="${c}" stroke="var(--surface)" stroke-width="2"/></g>`;
    });
  });
  s += `</svg>`;
  el.innerHTML = s; bindTips(el.querySelector("svg"));
}

// ---------- export / tables ----------
function ppTxt(v) { return v == null || !isFinite(v) ? "–" : (v > 0 ? "+" : v < 0 ? "−" : "") + num(Math.abs(v) * 100, 1) + " " + tr("pp"); }
function repTxt(l) { return l.representation ? tr("rep_" + l.representation) : "–"; }
function tsvLevels(d, r) {
  const head = [tr("level"), tr("women"), tr("men"), tr("pay_pp"), tr("w_share"), tr("vs_all") + " (" + tr("pp") + ")", tr("conf"), tr("women_are"), ""];
  const rows = r.levels.map(l => [l.level, l.women, l.men, Math.round(l.midpoint), l.share_women == null ? "" : +(l.share_women * 100).toFixed(2) + "%", l.share_diff == null ? "" : +(l.share_diff * 100).toFixed(2), l.confidence != null ? +(l.confidence * 100).toFixed(3) + "%" : "", repTxt(l), tr("lab_" + l.label)]);
  const sum = [[], ["", tr("women"), tr("men"), tr("gap"), tr("conf"), ""],
    [tr("t_mean"), Math.round(r.mean.women), Math.round(r.mean.men), +(r.mean.rel * 100).toFixed(2) + "%", +(r.mean.confidence * 100).toFixed(3) + "%", tr("lab_" + r.mean.label)],
    [tr("t_total"), Math.round(r.total.women), Math.round(r.total.men), +(r.total.rel * 100).toFixed(2) + "%", +(r.total.confidence * 100).toFixed(3) + "%", tr("lab_" + r.total.label)]];
  return [[d.name], head, ...rows, ...sum];
}
function tsvAll(rs) {
  const head = [tr("dept"), tr("women"), tr("men"), tr("t_mean"), tr("conf"), "", tr("t_total"), tr("conf"), "", tr("excess"), tr("conf"), ""];
  return [head, ...rs.map(({ name, r }) => [name, r.women, r.men,
    +(r.mean.rel * 100).toFixed(2) + "%", +(r.mean.confidence * 100).toFixed(3) + "%", tr("lab_" + r.mean.label),
    +(r.total.rel * 100).toFixed(2) + "%", +(r.total.confidence * 100).toFixed(3) + "%", tr("lab_" + r.total.label),
    +(r.ratio.excess * 100).toFixed(2) + "%", +(r.ratio.confidence * 100).toFixed(3) + "%", tr("lab_" + r.ratio.label)])];
}
function tableButtons(el, rowsFn, fname) {
  el.innerHTML = `<button class="b" data-a="copy">${esc(tr("copy_table"))}</button>${FRAMED ? "" : `<button class="b" data-a="dl">${esc(tr("download"))} CSV</button>`}`;
  el.querySelector("[data-a=copy]").onclick = e => copyText(rowsFn().map(r => r.join("\t")).join("\n"), e.target);
  const dl = el.querySelector("[data-a=dl]");
  if (dl) dl.onclick = () => download(fname, rowsFn().map(r => r.map(c => /[",;\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c).join(",")).join("\n"), "text/csv");
}
function copyText(text, btn) {
  const done = () => { if (btn) { const o = btn.textContent; btn.textContent = tr("copied") + " ✓"; setTimeout(() => btn.textContent = o, 1400); } };
  try { navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done)); } catch (e) { fallbackCopy(text, done); }
}
function fallbackCopy(text, done) {
  const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
  try { document.execCommand("copy"); done(); } catch (e) {} ta.remove();
}
function download(name, text, type) {
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

// ---------- modals ----------
function modal(html) {
  const bg = document.createElement("div"); bg.className = "modal-bg";
  bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  bg.addEventListener("click", e => { if (e.target === bg) bg.remove(); });
  document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { bg.remove(); document.removeEventListener("keydown", k); } });
  document.body.appendChild(bg); return bg;
}
function confirmBox(onYes, msg, yesLabel) {
  const m = modal(`<p>${esc(msg || tr("confirm_replace"))}</p><div class="row" style="justify-content:flex-end"><button class="b" data-x>${esc(tr("cancel"))}</button><button class="b primary" data-y>${esc(yesLabel || tr("yes"))}</button></div>`);
  m.querySelector("[data-x]").onclick = () => m.remove();
  m.querySelector("[data-y]").onclick = () => { m.remove(); onYes(); };
  m.querySelector("[data-y]").focus();
}
function exportBox() {
  const data = JSON.stringify({ app: "paygap-estimator", ...state, active: 0 }, null, 2);
  const m = modal(`<h2>${esc(tr("export_title"))}</h2><p class="help">${esc(tr("export_help"))}</p><textarea readonly>${esc(data)}</textarea>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="b" data-x>${esc(tr("close"))}</button>${FRAMED ? "" : `<button class="b" data-d>${esc(tr("download"))} .json</button>`}<button class="b primary" data-c>${esc(tr("copy"))}</button></div>`);
  m.querySelector("[data-x]").onclick = () => m.remove();
  m.querySelector("[data-c]").onclick = e => copyText(data, e.target);
  const dd = m.querySelector("[data-d]"); if (dd) dd.onclick = () => download(((state.org || "paygap") + "-" + (state.year || "")).replace(/\s+/g, "_") + ".json", data, "application/json");
}
function importBox() {
  const m = modal(`<h2>${esc(tr("import_title"))}</h2><p class="help">${esc(tr("import_help"))}</p>
    <input type="file" accept=".json,application/json" style="margin-bottom:10px"><textarea placeholder="{ … }"></textarea><div class="warn" hidden></div>
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="b" data-x>${esc(tr("cancel"))}</button><button class="b primary" data-y>${esc(tr("import"))}</button></div>`);
  const ta = m.querySelector("textarea"), w = m.querySelector(".warn");
  m.querySelector("input[type=file]").onchange = e => { const f = e.target.files[0]; if (f) f.text().then(t => ta.value = t); };
  m.querySelector("[data-x]").onclick = () => m.remove();
  m.querySelector("[data-y]").onclick = () => {
    try {
      const s = JSON.parse(ta.value);
      if (!valid(s)) throw 0;
      const lang = state.lang;
      state = Object.assign(example(), s, { lang: s.lang || lang, active: 0 });
      normalize(); save(); m.remove(); render();
    } catch (e) { w.hidden = false; w.textContent = tr("import_bad"); }
  };
}

// ---------- 5. method ----------
function viewMethod(v) {
  v.innerHTML = `<section class="card method"><h2>${esc(tr("method_title"))}</h2>${tr("method_html")}</section>`;
}

render();
})();
