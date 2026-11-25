(() => {
const STORE = "paygap-estimator-v1";
const FRAMED = (() => { try { return window.self !== window.top; } catch (e) { return true; } })();
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// ---------- state ----------
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
function example() {
  const lang = state ? state.lang : detectLang(), T = I18N[lang];
  const lv = i => T.level + " " + ROMAN[i];
  // Invented example data: four departments with different gender patterns
  return {
    v: 1, lang,
    org: T.ex_company, year: new Date().getFullYear(), currency: "EUR",
    distribution: "triangular", reference: "mean", thresholds: [0.99, 0.95, 0.90],
    levels: [
      { name: lv(0), min: 20000, max: 26000, mid: "" },
      { name: lv(1), min: 27000, max: 36000, mid: "" },
      { name: lv(2), min: 34000, max: 46000, mid: "" },
      { name: lv(3), min: 43000, max: 57000, mid: "" },
      { name: lv(4), min: 55000, max: 70000, mid: "" },
      { name: lv(5), min: 70000, max: 90000, mid: "" }],
    depts: [
      { name: T.ex_depts[0], w: [180, 160, 110, 40, 12, 3], m: [150, 170, 180, 140, 85, 40] },
      { name: T.ex_depts[1], w: [520, 140, 60, 25, 10, 4], m: [110, 150, 190, 120, 60, 25] },
      { name: T.ex_depts[2], w: [120, 210, 280, 60, 22, 8], m: [125, 205, 285, 58, 23, 8] },
      { name: T.ex_depts[3], w: [20, 30, 40, 10, 3, 1], m: [120, 180, 240, 60, 18, 6] },
      { name: T.ex_depts[4], w: [400, 80, 15, 3, 1, 0], m: [60, 120, 200, 180, 120, 60] }],
    active: 0
  };
}
function blank() {
  return { v: 1, lang: state.lang, org: "", year: new Date().getFullYear(), currency: "EUR",
    distribution: "triangular", reference: "mean", thresholds: [0.99, 0.95, 0.90],
    levels: [0, 1, 2].map(i => ({ name: tr("level") + " " + ROMAN[i], min: "", max: "", mid: "" })),
    depts: [{ name: tr("new_dept"), w: [0, 0, 0], m: [0, 0, 0] }], active: 0 };
}
function detectLang() {
  const l = (navigator.language || "en").toLowerCase();
  return l.startsWith("ca") ? "ca" : l.startsWith("es") ? "es" : l.startsWith("de") ? "de" : "en";
}
let state = null;
try { const s = JSON.parse(localStorage.getItem(STORE)); if (valid(s)) state = s; } catch (e) {}
// Replace the first version's four-level example (R1-R4) with the current example
if (state && state.levels.map(l => l.name).join() === "R1,R2,R3,R4") state = null;
if (!state) state = example();
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
      const k = I18N[l].ex_depts.indexOf(d.name);
      if (k >= 0) { d.name = T.ex_depts[k]; break; }
      const m = d.name.match(new RegExp("^" + I18N[l].ex_dept.replace("{x}", "([A-Z])") + "$"));
      if (m) { d.name = T.ex_dept.replace("{x}", m[1]); break; }
    }
  });
  state.levels.forEach(lv => {
    for (const l of langs) {
      const m = lv.name.match(new RegExp("^" + I18N[l].level + " ([IVX]+)$"));
      if (m) { lv.name = T.level + " " + m[1]; break; }
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
    <textarea id="paste" rows="5" style="width:100%" placeholder="Level I&#9;20000&#9;26000&#10;Level II&#9;27000&#9;36000"></textarea>
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
    state.levels.push({ name: tr("level") + " " + (ROMAN[state.levels.length] || state.levels.length + 1), min: last && last.max !== "" ? last.max : "", max: "", mid: "" });
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
  const W = tr("women_lc"), M = tr("men_lc");
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
  v.innerHTML = `<section class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(tr("results_title"))}${state.org ? " · " + esc(state.org) : ""}${state.year ? " · " + esc(state.year) : ""}</h2><span class="row" id="repBtns"></span></div>
    <div style="margin-top:10px">${deptChips(null, state.depts.length > 1)}</div></section><div id="res"></div>`;
  reportButtons($("#repBtns"));
  v.querySelectorAll("[data-dept]").forEach(b => b.onclick = () => { state.active = b.dataset.dept === "all" ? "all" : +b.dataset.dept; scenario = null; save(); render(); });
  if (state.active === "all") renderAll($("#res")); else renderDept($("#res"), state.active);
}

function verdictHTML(r) {
  const m = r.mean, parts = [];
  const same = Math.abs(m.diff) < 0.5;
  if (same) parts.push(tr("v_equal"));
  else parts.push(tr(m.diff < 0 ? "v_lower" : "v_higher", { pct: pct(Math.abs(m.rel)) }));
  if (same) { /* nothing to test */ } else if (m.label === "HiSig" || m.label === "Sig") parts.push(tr("v_sig", { label: tr("lab_" + m.label), conf: conf(m.confidence) }));
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
  // strong headcount imbalance: pay data can't show its other effects
  const wShare = r.women / (r.women + r.men);
  if (wShare < 0.3) html += `<p class="note">${esc(tr("v_min_w", { a: pct(wShare, 0), r: num(r.men / r.women, 1) }))}</p>`;
  else if (wShare > 0.7) html += `<p class="note">${esc(tr("v_min_m", { a: pct(1 - wShare, 0), r: num(r.women / r.men, 1) }))}</p>`;
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
    <div><h3 style="margin-top:0">${esc(tr("ch_pyramid"))}</h3><div class="legend"><span style="--c:var(--w)">${esc(tr("women"))}</span><span style="--c:var(--m)">${esc(tr("men"))}</span></div><div id="chHead"></div></div>
    <div><h3 style="margin-top:0">${esc(tr("ch_mean"))}</h3><div class="legend"><span style="--c:var(--w)">${esc(tr("women"))}</span><span style="--c:var(--m)">${esc(tr("men"))}</span></div><div id="chMean"></div></div>
  </div></section>
  <section class="card"><div class="charts">
    <div><h3 style="margin-top:0">${esc(tr("ch_contrib"))}</h3><p class="help">${esc(tr("ch_contrib_d", { gap: money(r.mean.diff) }))}</p>
      <div class="legend"><span style="--c:var(--pos)">${esc(tr("contrib_up"))}</span><span style="--c:var(--neg)">${esc(tr("contrib_down"))}</span></div><div id="chContrib"></div></div>
    <div id="euCard"></div>
  </div></section>
  <section class="card"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${esc(tr("per_level"))}</h2><span class="row" id="lvlBtns"></span></div>
    <p class="help">${esc(tr("per_level_d", { p: pct(r.women / (r.women + r.men), 1) }))}</p>
    <div class="tbl-scroll"><table id="lvlTbl"><thead><tr><th>${esc(tr("level"))}</th><th class="n">${esc(tr("women"))}</th><th class="n">${esc(tr("men"))}</th><th class="n">${esc(tr("pay_pp"))}</th><th class="n">${esc(tr("w_share"))}</th><th class="n">${esc(tr("vs_all"))}</th><th class="n">${esc(tr("conf"))}</th><th>${esc(tr("women_are"))}</th><th></th></tr></thead>
    <tbody>${r.levels.map(l => `<tr><td>${esc(l.level)}</td><td class="n">${num(l.women)}</td><td class="n">${num(l.men)}</td><td class="n">${money(l.midpoint)}</td><td class="n">${l.share_women == null ? "–" : pct(l.share_women, 1)}</td><td class="n">${ppTxt(l.share_diff)}</td><td class="n">${conf(l.confidence)}</td><td>${esc(repTxt(l))}</td><td>${badge(l.label)}</td></tr>`).join("")}</tbody></table></div>
    ${warns.length ? warns.map(w => `<div class="warn">${esc(w)}</div>`).join("") : ""}
  </section>
  <section class="card whatif" id="whatif"></section>`;
  chartPyramid($("#chHead"), r);
  chartMeans($("#chMean"), [{ name: d.name, r }]);
  chartContrib($("#chContrib"), r);
  euCard($("#euCard"), r);
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
  <section class="card"><h3 style="margin-top:0">${esc(tr("ch_pipe"))}</h3><p class="help">${esc(tr("ch_pipe_d"))}</p><div id="chPipe"></div></section>
  <section class="card"><h3 style="margin-top:0">${esc(tr("ch_heat"))}</h3><p class="help">${esc(tr("ch_heat_d"))}</p>
    <div class="legend"><span style="--c:var(--pos)">${esc(tr("heat_over"))}</span><span style="--c:var(--neg)">${esc(tr("heat_under"))}</span><span style="--c:var(--hover)">${esc(tr("heat_ns"))}</span></div><div id="heat"></div></section>
  <section class="card"><h3 style="margin-top:0">${esc(tr("ch_mean"))}</h3><div class="legend"><span style="--c:var(--w)">${esc(tr("women"))}</span><span style="--c:var(--m)">${esc(tr("men"))}</span></div><div id="chAll"></div></section>`;
  chartPipeline($("#chPipe"), rs);
  heatmap($("#heat"), rs);
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
  const rowH = items.length === 1 ? 80 : 46, W = Math.max(300, Math.round(el.clientWidth) || 460), L = Math.min(160, Math.round(W * 0.36)), R = 16, T = 8, B = 26, H = T + B + rowH * items.length;
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
    s += `<text class="lbl" x="${L - 10}" y="${cy + 4}" text-anchor="end">${esc(name.length > 24 ? name.slice(0, 23) + "…" : name)}</text>`;
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

// ---------- new charts ----------
const svgW = el => Math.max(300, Math.round(el.clientWidth) || 460);
const compact = v => new Intl.NumberFormat(loc(), { notation: "compact", maximumFractionDigits: 1 }).format(v);
const moneyC = v => (v < 0 ? "−" : v > 0 ? "+" : "") + money(Math.abs(v));

function chartPyramid(el, r) {
  const W = svgW(el), rowH = Math.max(22, Math.min(34, 200 / r.levels.length)), T = 6, B = 24;
  const H = T + B + rowH * r.levels.length, lab = 78, P = 22, half = (W - lab) / 2;
  const max = niceMax(Math.max(1, ...r.levels.map(l => Math.max(l.women, l.men))));
  const sx = v => (half - P) * v / max;
  const bh = Math.min(20, rowH - 6);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tr("ch_pyramid"))}">`;
  [0, 0.5, 1].forEach(f => {
    const xl = half - sx(f * max), xr = half + lab + sx(f * max);
    s += `<line x1="${xl}" x2="${xl}" y1="${T}" y2="${H - B}" stroke="var(--grid)"/><line x1="${xr}" x2="${xr}" y1="${T}" y2="${H - B}" stroke="var(--grid)"/>`;
    s += `<text x="${xl}" y="${H - 8}" text-anchor="middle">${num(f * max)}</text><text x="${xr}" y="${H - 8}" text-anchor="middle">${num(f * max)}</text>`;
  });
  r.levels.slice().reverse().forEach((l, i) => {
    const y = T + rowH * i + (rowH - bh) / 2, cy = T + rowH * i + rowH / 2;
    const ww = sx(l.women), mw = sx(l.men), rr = Math.min(4, bh / 2);
    const t_ = `<b>${esc(l.level)}</b><br>${esc(tr("women"))}: ${num(l.women)}<br>${esc(tr("men"))}: ${num(l.men)}<br>${esc(tr("w_share"))}: ${l.share_women == null ? "–" : pct(l.share_women, 1)}`;
    s += `<g data-tip="${esc(t_)}"><rect x="0" y="${T + rowH * i}" width="${W}" height="${rowH}" fill="transparent"/>`;
    if (ww > 0) s += `<path d="M${half},${y} H${half - ww + Math.min(rr, ww)} q-${Math.min(rr, ww)},0 -${Math.min(rr, ww)},${Math.min(rr, ww)} V${y + bh - Math.min(rr, ww)} q0,${Math.min(rr, ww)} ${Math.min(rr, ww)},${Math.min(rr, ww)} H${half} Z" fill="var(--w)"/>`;
    if (mw > 0) s += `<path d="M${half + lab},${y} H${half + lab + mw - Math.min(rr, mw)} q${Math.min(rr, mw)},0 ${Math.min(rr, mw)},${Math.min(rr, mw)} V${y + bh - Math.min(rr, mw)} q0,${Math.min(rr, mw)} -${Math.min(rr, mw)},${Math.min(rr, mw)} H${half + lab} Z" fill="var(--m)"/>`;
    s += `<text class="lbl" x="${half + lab / 2}" y="${cy + 4}" text-anchor="middle">${esc(l.level.length > 11 ? l.level.slice(0, 10) + "…" : l.level)}</text></g>`;
  });
  el.innerHTML = s + "</svg>"; bindTips(el.querySelector("svg"));
}

function chartContrib(el, r) {
  const W = svgW(el), H = 230, T = 10, B = 26, n = r.levels.length;
  const vals = r.levels.map(l => l.contribution || 0);
  const m = niceMax(Math.max(1, ...vals.map(Math.abs)));
  const L = 14 + 7 * compact(-m).length, gw = (W - L - 8) / n, bw = Math.min(24, gw * 0.55);
  const y = v => T + (H - T - B) * (m - v) / (2 * m);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tr("ch_contrib"))}">`;
  [-m, -m / 2, 0, m / 2, m].forEach(v => s += `<line x1="${L}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" stroke="${v === 0 ? "var(--axis)" : "var(--grid)"}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${(v > 0 ? "+" : v < 0 ? "−" : "") + compact(Math.abs(v))}</text>`);
  r.levels.forEach((l, i) => {
    const v = vals[i], cx = L + gw * i + gw / 2, y0 = y(0), y1 = y(v), h = Math.abs(y1 - y0), rr = Math.min(4, h / 2);
    const t_ = `<b>${esc(l.level)}</b><br>${moneyC(v)}`;
    s += `<g data-tip="${esc(t_)}"><rect x="${cx - gw / 2}" y="${T}" width="${gw}" height="${H - T - B}" fill="transparent"/>`;
    if (h > 0.5) s += v > 0
      ? `<path d="M${cx - bw / 2},${y0} V${y1 + rr} q0,-${rr} ${rr},-${rr} H${cx + bw / 2 - rr} q${rr},0 ${rr},${rr} V${y0} Z" fill="var(--pos)"/>`
      : `<path d="M${cx - bw / 2},${y0} V${y1 - rr} q0,${rr} ${rr},${rr} H${cx + bw / 2 - rr} q${rr},0 ${rr},-${rr} V${y0} Z" fill="var(--neg)"/>`;
    s += `<text class="lbl" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(l.level.replace(/^\S+\s+(?=[IVX]+$)/, ""))}</text></g>`;
  });
  el.innerHTML = s + "</svg>"; bindTips(el.querySelector("svg"));
}

function euCard(el, r) {
  const e = r.eu, sgn = v => (v > 0 ? "+" : v < 0 ? "−" : "") + pct(Math.abs(v), 1);
  el.innerHTML = `<h3 style="margin-top:0">${esc(tr("eu_title"))}</h3><p class="help">${esc(tr("eu_d"))}</p>
    <div class="tiles">
      <div class="tile"><div class="k">${esc(tr("eu_mean"))}</div><div class="v">${sgn(e.mean_gap)}</div><div class="s">${money(r.mean.women)} / ${money(r.mean.men)}</div></div>
      <div class="tile"><div class="k">${esc(tr("eu_median"))}</div><div class="v">${sgn(e.median_gap)}</div><div class="s">${money(e.median_women)} / ${money(e.median_men)}</div></div>
      <div class="tile"><div class="k">${esc(tr("eu_th"))}</div><div class="flag" style="color:${e.above_threshold ? "var(--bad)" : "var(--good)"}">${e.above_threshold ? "⚠ " + esc(tr("eu_above")) : "✓ " + esc(tr("eu_below"))}</div></div>
    </div>
    <div style="font-size:13px;color:var(--ink2);margin-bottom:4px">${esc(tr("eu_quart"))}</div>
    <div class="legend"><span style="--c:var(--w)">${esc(tr("women"))}</span><span style="--c:var(--m)">${esc(tr("men"))}</span></div><div id="chQuart"></div>`;
  const c = $("#chQuart", el), W = svgW(c), H = 170, T = 6, B = 24, L = 36, gw = (W - L - 8) / 4, bw = Math.min(46, gw * 0.6);
  const y = v => T + (H - T - B) * (1 - v);
  let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tr("eu_quart"))}">`;
  [0, 0.5, 1].forEach(v => s += `<line x1="${L}" x2="${W - 8}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${pct(v, 0)}</text>`);
  e.quartiles.forEach((q, i) => {
    const sw = isFinite(q.share_women) ? q.share_women : 0, cx = L + gw * i + gw / 2;
    const lab = i === 0 ? tr("q1") : i === 3 ? tr("q4") : "Q" + (i + 1);
    const t_ = `<b>${esc(lab)}</b><br>${esc(tr("women"))}: ${pct(sw, 1)}<br>${esc(tr("men"))}: ${pct(1 - sw, 1)}`;
    s += `<g data-tip="${esc(t_)}"><rect x="${cx - bw / 2}" y="${y(1)}" width="${bw}" height="${y(sw) - y(1) - (sw > 0 && sw < 1 ? 2 : 0)}" fill="var(--m)" rx="3"/>
      <rect x="${cx - bw / 2}" y="${y(sw)}" width="${bw}" height="${y(0) - y(sw)}" fill="var(--w)" rx="3"/>
      <text class="lbl" x="${cx}" y="${H - 8}" text-anchor="middle">${esc(lab)}</text>
      ${sw >= 0.12 ? `<text x="${cx}" y="${(y(sw) + y(0)) / 2 + 4}" text-anchor="middle" style="fill:#fff;font-size:11px">${pct(sw, 0)}</text>` : ""}</g>`;
  });
  c.innerHTML = s + "</svg>"; bindTips(c.querySelector("svg"));
}

function chartPipeline(el, items) {
  const its = items.slice(0, 8), W = svgW(el), H = 280, T = 10, B = 26, L = 64, R = 40;
  const n = state.levels.length, x = i => L + (W - L - R) * (n === 1 ? 0.5 : i / (n - 1)), y = v => T + (H - T - B) * (1 - v);
  const dashes = ["", "6 4", "2 3", "10 3 2 3", "", "6 4", "2 3", "10 3 2 3"];
  const mark = (k, cx, cy, c) => {
    const sh = k % 5;
    if (sh === 0) return `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${c}" stroke="var(--surface)" stroke-width="1.5"/>`;
    if (sh === 1) return `<rect x="${cx - 4}" y="${cy - 4}" width="8" height="8" fill="${c}" stroke="var(--surface)" stroke-width="1.5"/>`;
    if (sh === 2) return `<path d="M${cx},${cy - 5} L${cx + 5},${cy + 4} L${cx - 5},${cy + 4} Z" fill="${c}" stroke="var(--surface)" stroke-width="1.5"/>`;
    if (sh === 3) return `<path d="M${cx},${cy - 5.5} L${cx + 5.5},${cy} L${cx},${cy + 5.5} L${cx - 5.5},${cy} Z" fill="${c}" stroke="var(--surface)" stroke-width="1.5"/>`;
    return `<path d="M${cx - 4.5},${cy - 4.5} L${cx + 4.5},${cy + 4.5} M${cx + 4.5},${cy - 4.5} L${cx - 4.5},${cy + 4.5}" stroke="${c}" stroke-width="2.5"/>`;
  };
  let s = `<div class="legend" style="flex-wrap:wrap">${its.map((it, k) => `<span style="--c:var(--s${k + 1})">${esc(it.name)} · ${esc(tr("overall_w", { p: pct(it.r.women / (it.r.women + it.r.men), 0) }))}</span>`).join("")}</div>`;
  s += `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="${esc(tr("ch_pipe"))}">`;
  [0, 0.25, 0.5, 0.75, 1].forEach(v => s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--grid)"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${pct(v, 0)}</text>`);
  const shortL = nm => W < 560 ? nm.replace(/^\S+\s+(?=[IVX]+$)/, "") : nm;
  state.levels.forEach((l, i) => { const t_ = shortL(l.name); s += `<text class="lbl" x="${x(i)}" y="${H - 8}" text-anchor="middle">${esc(t_.length > 11 ? t_.slice(0, 10) + "…" : t_)}</text>`; });
  its.forEach((it, k) => {
    const c = `var(--s${k + 1})`, pts = it.r.levels.map((l, i) => l.share_women == null ? null : [x(i), y(l.share_women)]);
    let d = "", pen = false;
    pts.forEach(p => { if (!p) { pen = false; return; } d += (pen ? "L" : "M") + p[0] + "," + p[1] + " "; pen = true; });
    s += `<path d="${d}" fill="none" stroke="${c}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" ${dashes[k] ? `stroke-dasharray="${dashes[k]}"` : ""}/>`;
    it.r.levels.forEach((l, i) => { if (!pts[i]) return;
      const t_ = `<b>${esc(it.name)}</b><br>${esc(l.level)}: ${pct(l.share_women, 1)} ${esc(tr("women_lc"))}<br>${badge(l.label)}`;
      s += `<g data-tip="${esc(t_)}"><circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="10" fill="transparent"/>${mark(k, pts[i][0], pts[i][1], c)}</g>`; });
  });
  s += "</svg>" + (items.length > 8 ? `<p class="help">${esc(tr("first8"))}</p>` : "");
  el.innerHTML = s; bindTips(el.querySelector("svg"));
}

function heatmap(el, items) {
  const n = state.levels.length;
  let h = `<div class="tbl-scroll"><div class="heat" style="grid-template-columns:minmax(130px,1.6fr) repeat(${n},minmax(44px,1fr));min-width:${130 + n * 48}px"><div></div>`;
  h += state.levels.map(l => `<div class="hd" title="${esc(l.name)}">${esc(l.name.replace(/^\S+\s+(?=[IVX]+$)/, ""))}</div>`).join("");
  items.forEach(({ name, r }) => {
    h += `<div class="rl"><span title="${esc(name)}">${esc(name)}</span><span style="font-size:11px;color:var(--muted)">${esc(tr("overall_w", { p: pct(r.women / (r.women + r.men), 0) }))}</span></div>`;
    r.levels.forEach(l => {
      if (l.share_diff == null) { h += `<div class="c">–</div>`; return; }
      const pp = l.share_diff * 100, sig = l.label === "HiSig" || l.label === "Sig", a = Math.abs(pp);
      const tip = `${name} · ${l.level}: ${ppTxt(l.share_diff)} · ${tr("lab_" + l.label)}`;
      let st = "";
      if (sig && a >= 0.5) {
        const alpha = a < 10 ? 0.3 : a < 25 ? 0.6 : 0.95;
        st = `background:color-mix(in srgb, var(${pp > 0 ? "--pos" : "--neg"}) ${Math.round(alpha * 100)}%, transparent);color:${alpha > 0.5 ? "#fff" : "var(--ink)"};font-weight:${alpha > 0.5 ? 600 : 400}`;
      }
      const rd = Math.round(pp);
      h += `<div class="c" style="${st}" title="${esc(tip)}">${(rd > 0 ? "+" : rd < 0 ? "−" : "") + num(Math.abs(rd), 0)}</div>`;
    });
  });
  el.innerHTML = h + "</div></div>";
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
  el.innerHTML = `<button class="b" data-a="copy">${esc(tr("copy_table"))}</button><button class="b" data-a="dl" hidden>${esc(tr("download"))} CSV</button>`;
  canDownload().then(ok => { const b = el.querySelector("[data-a=dl]"); if (b) b.hidden = !ok; });
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
// Downloads: a normal download on GitHub/GitLab; on the Claude page through its downloads capability
let _canDl = null;
function canDownload() {
  if (!FRAMED) return Promise.resolve(true);
  if (!_canDl) _canDl = (window.claude && window.claude.use ? window.claude.use("downloads") : Promise.resolve(null)).then(x => !!x, () => false);
  return _canDl;
}
function download(name, text, type) {
  saveFile(name, new TextEncoder().encode(text), type).catch(e => console.warn(e));
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
    <div class="row" style="justify-content:flex-end;margin-top:10px"><button class="b" data-x>${esc(tr("close"))}</button><button class="b" data-d hidden>${esc(tr("download"))} .json</button><button class="b primary" data-c>${esc(tr("copy"))}</button></div>`);
  m.querySelector("[data-x]").onclick = () => m.remove();
  m.querySelector("[data-c]").onclick = e => copyText(data, e.target);
  canDownload().then(ok => { const b = m.querySelector("[data-d]"); if (b) b.hidden = !ok; });
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

/*@@REPORT@@*/

render();
})();
