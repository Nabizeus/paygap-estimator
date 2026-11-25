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
  function logFactorials(n) {
    const a = new Float64Array(n + 1);
    for (let i = 2; i <= n; i++) a[i] = a[i - 1] + Math.log(i);
    return a;
  }
  // Two-sided Fisher's exact test for the 2x2 table [[a, b], [c, d]]
  function fisher(a, b, c, d, lf) {
    const r1 = a + b, c1 = a + c, c2 = b + d, N = a + b + c + d;
    if (!lf || lf.length <= N) lf = logFactorials(N);
    const lp = x => lf[c1] - lf[x] - lf[c1 - x] + lf[c2] - lf[r1 - x] - lf[c2 - r1 + x] - (lf[N] - lf[r1] - lf[N - r1]);
    const lo = Math.max(0, r1 - c2), hi = Math.min(r1, c1), obs = lp(a);
    let p = 0;
    for (let x = lo; x <= hi; x++) { const v = lp(x); if (v <= obs + 1e-7) p += Math.exp(v); }
    return Math.min(1, p);
  }
  // EU Pay Transparency style indicators, estimated from band midpoints:
  // mean and median gap relative to men's pay, and women's share per pay quartile.
  function euIndicators(rows, W, M, aw, am) {
    const sorted = rows.filter(r => r.women + r.men > 0).slice().sort((a, b) => a.midpoint - b.midpoint);
    const median = key => {
      const tot = sorted.reduce((a, r) => a + r[key], 0);
      if (!tot) return NaN;
      const half = (tot + 1) / 2; let acc = 0;
      for (const r of sorted) { acc += r[key]; if (acc >= half) return r.midpoint; }
      return NaN;
    };
    const mw = median("women"), mm = median("men");
    const N = W + M, q = [[0, 0], [0, 0], [0, 0], [0, 0]];
    let pos = 0;
    for (const r of sorted) {
      const n = r.women + r.men;
      for (let k = 0; k < 4; k++) {
        const ov = Math.max(0, Math.min(pos + n, (k + 1) * N / 4) - Math.max(pos, k * N / 4));
        q[k][0] += ov * r.women / n; q[k][1] += ov * r.men / n;
      }
      pos += n;
    }
    const meanGap = am ? (aw - am) / am : NaN, medianGap = mm ? (mw - mm) / mm : NaN;
    return { mean_gap: meanGap, median_gap: medianGap, median_women: mw, median_men: mm,
      quartiles: q.map(([w, m]) => ({ women: w, men: m, share_women: w + m ? w / (w + m) : NaN })),
      above_threshold: Math.abs(meanGap) >= 0.05 || Math.abs(medianGap) >= 0.05 };
  }
  const mid = l => (l.mid != null && l.mid !== "" && isFinite(+l.mid)) ? +l.mid : (+l.min + +l.max) / 2;

  /** levels: [{name,min,max,mid?}], women:[n], men:[n] */
  function analyze(levels, women, men, opts = {}) {
    const dist = opts.distribution || "triangular";
    const ref = opts.reference || "mean";
    const th = opts.thresholds || [0.99, 0.95, 0.90];
    const k = DIVISORS[dist];
    let fw = 0, fm = 0, vw = 0, vm = 0, nw = 0, nm = 0;
    const W = levels.reduce((a, _, i) => a + (+women[i] || 0), 0);
    const M = levels.reduce((a, _, i) => a + (+men[i] || 0), 0);
    const lf = logFactorials(W + M), share = W + M ? W / (W + M) : NaN;
    const rows = levels.map((l, i) => {
      const w = +women[i] || 0, m = +men[i] || 0, n = w + m;
      const mp = mid(l), sigma = (+l.max - +l.min) / k;
      const pw = w * mp, pm = m * mp, ew = w * sigma, em = m * sigma;
      fw += pw; fm += pm; vw += ew * ew; vm += em * em; nw += w; nm += m;
      // Representation: women's share at this level vs the rest of staff (Fisher's exact test)
      const testable = n > 0 && n < W + M && W > 0 && M > 0;
      const sw_ = n ? w / n : null, expected = n * share;
      let res = { p: null, confidence: null, label: "n/a" };
      if (testable) {
        const p = fisher(w, m, W - w, M - m, lf), conf = 1 - p;
        res = { p, confidence: conf, label: label(conf, th) };
      }
      const rep = !testable ? null : Math.abs(w - expected) < 0.5 ? "as_expected" : w < expected ? "under" : "over";
      return Object.assign({ level: l.name, women: w, men: m, midpoint: mp, sigma,
        pay_women: pw, pay_men: pm, err_women: ew, err_men: em, testable,
        share_women: sw_, share_overall: share, share_diff: sw_ == null ? null : sw_ - share,
        expected_women: expected, representation: rep }, res);
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
    // Where the gap comes from: each level's contribution to (women's average - men's average)
    rows.forEach(r => { r.contribution = r.midpoint * (r.women / nw - r.men / nm); });
    const eu = euIndicators(rows, nw, nm, aw, am);
    return Object.assign(out, { total, mean, ratio, eu });
  }
  return { analyze, tP, label, mid, fisher };
})();
if (typeof module !== "undefined") module.exports = PayGap;
