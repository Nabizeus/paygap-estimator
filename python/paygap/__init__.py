"""Band-based gender pay gap estimator.

Estimates whether pay differs between women and men when only salary bands
(min / max / midpoint per level) and headcounts per level are known.

Method (following the GUM - Guide to the Expression of Uncertainty in
Measurement):

* Everyone at a level is assumed to earn the band midpoint.
* The uncertainty of one salary is the band width divided by sqrt(24)
  (triangular distribution) or sqrt(12) (uniform distribution).
* The pay of a group at a level is N * midpoint with uncertainty N * sigma
  (salaries within a band are treated as fully correlated).
* Level uncertainties are added in quadrature for the totals.
* Differences are tested with a two-tailed Student t-test,
  degrees of freedom = N_women + N_men - 2.

No third-party dependencies: the Student t distribution is computed with the
regularised incomplete beta function.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field, asdict
from typing import Iterable, Sequence

__all__ = ["Level", "analyze", "t_two_tailed_p", "label_for"]
__version__ = "1.0.0"

DIVISORS = {"triangular": math.sqrt(24), "uniform": math.sqrt(12)}
DEFAULT_THRESHOLDS = (0.99, 0.95, 0.90)
LABELS = ("HiSig", "Sig", "MidSig", "NotSig")


# --------------------------------------------------------------------------
# Student t distribution
# --------------------------------------------------------------------------
def _betacf(a: float, b: float, x: float) -> float:
    """Continued fraction for the incomplete beta function (Lentz)."""
    tiny, eps = 1e-300, 1e-15
    qab, qap, qam = a + b, a + 1.0, a - 1.0
    c, d = 1.0, 1.0 - qab * x / qap
    d = 1.0 / (d if abs(d) > tiny else tiny)
    h = d
    for m in range(1, 400):
        m2 = 2 * m
        aa = m * (b - m) * x / ((qam + m2) * (a + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > tiny else tiny)
        c = 1.0 + aa / c
        c = c if abs(c) > tiny else tiny
        h *= d * c
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
        d = 1.0 + aa * d
        d = 1.0 / (d if abs(d) > tiny else tiny)
        c = 1.0 + aa / c
        c = c if abs(c) > tiny else tiny
        delta = d * c
        h *= delta
        if abs(delta - 1.0) < eps:
            break
    return h


def _betainc(a: float, b: float, x: float) -> float:
    """Regularised incomplete beta I_x(a, b)."""
    if x <= 0:
        return 0.0
    if x >= 1:
        return 1.0
    lbt = (math.lgamma(a + b) - math.lgamma(a) - math.lgamma(b)
           + a * math.log(x) + b * math.log(1 - x))
    bt = math.exp(lbt)
    if x < (a + 1) / (a + b + 2):
        return bt * _betacf(a, b, x) / a
    return 1.0 - bt * _betacf(b, a, 1 - x) / b


def t_two_tailed_p(t: float, dof: float) -> float:
    """Two-tailed p-value of Student's t (Excel TDIST(|t|, dof, 2))."""
    if dof <= 0 or not math.isfinite(t):
        return float("nan") if not math.isinf(t) else 0.0
    return _betainc(dof / 2.0, 0.5, dof / (dof + t * t))


def label_for(confidence: float, thresholds: Sequence[float] = DEFAULT_THRESHOLDS) -> str:
    if confidence is None or not math.isfinite(confidence):
        return "n/a"
    for lab, th in zip(LABELS, thresholds):
        if confidence >= th:
            return lab
    return LABELS[-1]


# --------------------------------------------------------------------------
# Data model
# --------------------------------------------------------------------------
@dataclass
class Level:
    name: str
    min: float
    max: float
    women: int = 0
    men: int = 0
    mid: float | None = None

    @property
    def midpoint(self) -> float:
        return self.mid if self.mid is not None else (self.min + self.max) / 2.0

    @property
    def width(self) -> float:
        return self.max - self.min


def _test(diff: float, err: float, dof: int, thresholds) -> dict:
    if err <= 0 or dof <= 0:
        return {"diff": diff, "error": err, "t": None, "dof": dof,
                "p": None, "confidence": None, "label": "n/a"}
    t = diff / err
    p = t_two_tailed_p(t, dof)
    conf = 1.0 - p
    return {"diff": diff, "error": err, "t": t, "dof": dof, "p": p,
            "confidence": conf, "label": label_for(conf, thresholds)}


def _rel(diff: float, women: float, men: float, reference: str) -> float | None:
    base = men if reference == "men" else (women + men) / 2.0
    return diff / base if base else None


def analyze(levels: Iterable[Level | dict],
            distribution: str = "triangular",
            reference: str = "mean",
            thresholds: Sequence[float] = DEFAULT_THRESHOLDS) -> dict:
    """Run the full analysis for one department.

    distribution: "triangular" (default) or "uniform".
    reference:    "mean" -> gap relative to the average of both groups,
                  "men"  -> gap relative to men's figure.
    Negative differences mean women are paid less.
    """
    if distribution not in DIVISORS:
        raise ValueError("distribution must be 'triangular' or 'uniform'")
    k = DIVISORS[distribution]
    lv = [l if isinstance(l, Level) else Level(**l) for l in levels]

    rows = []
    fw = fm = vw = vm = 0.0
    nw = nm = 0
    for l in lv:
        if l.max < l.min:
            raise ValueError(f"Level {l.name}: max < min")
        sigma = l.width / k
        pw, pm = l.women * l.midpoint, l.men * l.midpoint
        ew, em = l.women * sigma, l.men * sigma
        fw, fm, vw, vm = fw + pw, fm + pm, vw + ew ** 2, vm + em ** 2
        nw, nm = nw + l.women, nm + l.men
        diff = pw - pm
        testable = l.women > 0 and l.men > 0
        res = _test(diff, math.hypot(ew, em), l.women + l.men - 2, thresholds) if testable else \
            {"diff": diff, "error": math.hypot(ew, em), "t": None, "dof": l.women + l.men - 2,
             "p": None, "confidence": None, "label": "n/a"}
        rows.append({"level": l.name, "women": l.women, "men": l.men,
                     "midpoint": l.midpoint, "sigma": sigma,
                     "pay_women": pw, "pay_men": pm, "err_women": ew, "err_men": em,
                     "testable": testable, "rel": _rel(diff, pw, pm, reference), **res,
                     "favours": None if not testable else ("women" if diff > 0 else "men" if diff < 0 else "parity")})

    gw, gm = math.sqrt(vw), math.sqrt(vm)
    dof = nw + nm - 2
    out = {"distribution": distribution, "reference": reference,
           "women": nw, "men": nm, "levels": rows}
    if nw == 0 or nm == 0:
        out["error"] = "Both groups need at least one person."
        return out

    # 1. total pay
    total = _test(fw - fm, math.hypot(gw, gm), dof, thresholds)
    total.update(women=fw, men=fm, err_women=gw, err_men=gm,
                 rel=_rel(fw - fm, fw, fm, reference))
    # 2. average pay
    aw, am, sw, sm = fw / nw, fm / nm, gw / nw, gm / nm
    mean = _test(aw - am, math.hypot(sw, sm), dof, thresholds)
    mean.update(women=aw, men=am, err_women=sw, err_men=sm,
                rel=_rel(aw - am, aw, am, reference))
    # 3. pay ratio vs headcount ratio (men:women)
    head_ratio = nm / nw
    pay_ratio = fm / fw if fw else float("nan")
    ratio_err = pay_ratio * math.sqrt((gw / fw) ** 2 + (gm / fm) ** 2) if fw and fm else 0.0
    ratio = _test(head_ratio - pay_ratio, ratio_err, dof, thresholds)
    ratio.update(headcount_ratio=head_ratio, pay_ratio=pay_ratio,
                 excess=pay_ratio / head_ratio - 1)

    out.update(total=total, mean=mean, ratio=ratio)
    return out


if __name__ == "__main__":  # pragma: no cover
    import json, sys
    data = json.load(sys.stdin)
    print(json.dumps(analyze(data["levels"], data.get("distribution", "triangular"),
                             data.get("reference", "mean")), indent=2))
