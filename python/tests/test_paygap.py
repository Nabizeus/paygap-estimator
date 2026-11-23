import math
import pytest
from paygap import analyze, Level, t_two_tailed_p

BANDS = [("R1", 18522, 25189, 21856), ("R2", 27522, 45622, 36572),
         ("R3", 39677, 63250, 51464), ("R4", 55000, 88555, 71778)]


def dept(w, m):
    return [Level(n, lo, hi, w[i], m[i], mid) for i, (n, lo, hi, mid) in enumerate(BANDS)]


def test_t_distribution_matches_scipy():
    stats = pytest.importorskip("scipy.stats")
    for t, d in [(0.5, 3), (2.1, 26), (5.3, 165), (0.01, 48), (8, 10)]:
        assert math.isclose(t_two_tailed_p(t, d), 2 * stats.t.sf(t, d), rel_tol=1e-9)


def test_matches_original_spreadsheet_department_a():
    r = analyze(dept([4, 8, 0, 0], [3, 8, 3, 2]))
    assert r["total"]["rel"] == pytest.approx(-0.5329488115, abs=1e-9)
    assert r["total"]["confidence"] == pytest.approx(0.9999968148, abs=1e-9)
    assert r["mean"]["rel"] == pytest.approx(-0.2570186533, abs=1e-9)
    assert r["mean"]["confidence"] == pytest.approx(0.9899957004, abs=1e-9)
    assert r["ratio"]["pay_ratio"] == pytest.approx(1.726557895, abs=1e-9)
    assert r["mean"]["label"] == "Sig"


def test_uniform_matches_spreadsheet():
    r = analyze(dept([4, 8, 0, 0], [3, 8, 3, 2]), distribution="uniform")
    assert r["total"]["confidence"] == pytest.approx(0.9997019406, abs=1e-9)


def test_fisher_matches_scipy():
    stats = pytest.importorskip("scipy.stats")
    from paygap import fisher_exact_two_sided
    for t in [(4, 3, 8, 13), (0, 3, 12, 13), (1000, 3000, 1900, 3789), (50, 89, 2850, 6700), (2, 0, 10, 16)]:
        a, b, c, d = t
        assert math.isclose(fisher_exact_two_sided(*t), stats.fisher_exact([[a, b], [c, d]])[1], rel_tol=1e-6, abs_tol=1e-12)


def test_representation_levels():
    r = analyze(dept([4, 8, 0, 0], [3, 8, 3, 2]))
    reps = [l["representation"] for l in r["levels"]]
    assert reps == ["over", "over", "under", "under"]
    assert all(l["label"] == "NotSig" for l in r["levels"])  # small groups: no significant difference


def test_parity():
    r = analyze(dept([5, 5, 5, 5], [5, 5, 5, 5]))
    assert r["mean"]["diff"] == 0 and r["mean"]["label"] == "NotSig"
