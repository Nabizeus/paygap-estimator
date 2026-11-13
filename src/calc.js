// ---- Pay gap calculations (mirror of python/paygap/__init__.py) ----
const PayGap = (() => {
  const DIVISORS = { triangular: Math.sqrt(24), uniform: Math.sqrt(12) };
  const LABELS = ["HiSig", "Sig", "MidSig", "NotSig"];

  function lgamma(x) {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function betacf(a, b, x) {
    const tiny = 1e-300, eps = 1e-15;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    d = 1 / (Math.abs(d) > tiny ? d : tiny);
    let h = d;
    for (let m = 1; m < 400; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; d = 1 / (Math.abs(d) > tiny ? d : tiny);
      c = 1 + aa / c; c = Math.abs(c) > tiny ? c : tiny;
      h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; d = 1 / (Math.abs(d) > tiny ? d : tiny);
      c = 1 + aa / c; c = Math.abs(c) > tiny ? c : tiny;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < eps) break;
    }
    return h;
  }
  function betainc(a, b, x) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) return bt * betacf(a, b, x) / a;
    return 1 - bt * betacf(b, a, 1 - x) / b;
  }
  // Two-tailed p of Student t (= Excel TDIST(|t|, dof, 2))
  function tP(t, dof) {
    if (!(dof > 0)) return NaN;
    if (!isFinite(t)) return 0;
    return betainc(dof / 2, 0.5, dof / (dof + t * t));
  }
  function label(conf, th) {
    if (conf == null || !isFinite(conf)) return "n/a";
    for (let i = 0; i < 3; i++) if (conf >= th[i]) return LABELS[i];
    return LABELS[3];
  }
  function test(diff, err, dof, th) {
    if (!(err > 0) || !(dof > 0)) return { diff, error: err, t: null, dof, p: null, confidence: null, label: "n/a" };
    const t = diff / err, p = tP(t, dof), conf = 1 - p;
    return { diff, error: err, t, dof, p, confidence: conf, label: label(conf, th) };
  }
  function rel(diff, w, m, ref) {
    const base = ref === "men" ? m : (w + m) / 2;
    return base ? diff / base : null;
  }
  const mid = l => (l.mid != null && l.mid !== "" && isFinite(+l.mid)) ? +l.mid : (+l.min + +l.max) / 2;

  /** levels: [{name,min,max,mid?}], women:[n], men:[n] */
  function analyze(levels, women, men, opts = {}) {
    const dist = opts.distribution || "triangular";
    const ref = opts.reference || "mean";
    const th = opts.thresholds || [0.99, 0.95, 0.90];
    const k = DIVISORS[dist];
    let fw = 0, fm = 0, vw = 0, vm = 0, nw = 0, nm = 0;
    const rows = levels.map((l, i) => {
      const w = +women[i] || 0, m = +men[i] || 0;
      const mp = mid(l), sigma = (+l.max - +l.min) / k;
      const pw = w * mp, pm = m * mp, ew = w * sigma, em = m * sigma;
      fw += pw; fm += pm; vw += ew * ew; vm += em * em; nw += w; nm += m;
      const diff = pw - pm, testable = w > 0 && m > 0;
      const err = Math.hypot(ew, em);
      const res = testable ? test(diff, err, w + m - 2, th)
        : { diff, error: err, t: null, dof: w + m - 2, p: null, confidence: null, label: "n/a" };
      return Object.assign({ level: l.name, women: w, men: m, midpoint: mp, sigma,
        pay_women: pw, pay_men: pm, err_women: ew, err_men: em, testable,
        rel: rel(diff, pw, pm, ref),
        favours: !testable ? null : diff > 0 ? "women" : diff < 0 ? "men" : "parity" }, res);
    });
    const out = { distribution: dist, reference: ref, women: nw, men: nm, levels: rows };
    if (nw === 0 || nm === 0) { out.error = "empty"; return out; }
    const gw = Math.sqrt(vw), gm = Math.sqrt(vm), dof = nw + nm - 2;
    const total = test(fw - fm, Math.hypot(gw, gm), dof, th);
    Object.assign(total, { women: fw, men: fm, err_women: gw, err_men: gm, rel: rel(fw - fm, fw, fm, ref) });
    const aw = fw / nw, am = fm / nm, sw = gw / nw, sm = gm / nm;
    const mean = test(aw - am, Math.hypot(sw, sm), dof, th);
    Object.assign(mean, { women: aw, men: am, err_women: sw, err_men: sm, rel: rel(aw - am, aw, am, ref) });
    const hr = nm / nw, pr = fw ? fm / fw : NaN;
    const rerr = fw && fm ? pr * Math.sqrt((gw / fw) ** 2 + (gm / fm) ** 2) : 0;
    const ratio = test(hr - pr, rerr, dof, th);
    Object.assign(ratio, { headcount_ratio: hr, pay_ratio: pr, excess: pr / hr - 1 });
    return Object.assign(out, { total, mean, ratio });
  }
  return { analyze, tP, label, mid };
})();
if (typeof module !== "undefined") module.exports = PayGap;
