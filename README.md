# Pay Gap Estimator

This tool estimates the **gender pay gap** from a company's **salary table** (min/max pay per level) and the **number of women and men at each level**. It doesn't need individual salaries.
The web app: https://nabizeus.github.io/paygap-estimator/

It is available in two forms that use the same method and give the same numbers:

| | For | Where |
|---|---|---|
| **Web app** (`index.html`) | Anyone. Nothing to install. Available in English, Spanish, Catalan and German | Any browser, or GitHub Pages |
| **Python package** (`python/paygap`) | Analysts, scripts and notebooks | `pip install ./python` |

## Web app

Open `index.html` in a browser. The app has four steps:

1. **Setup**: organisation, currency, salary distribution (triangular or uniform), the reference for the gap, and significance thresholds.
2. **Salary table**: levels with min, max and an optional midpoint. You can paste the table straight from Excel.
3. **Headcount**: women and men per level, for any number of departments.
4. **Results**: a plain-language verdict, three statistical tests, a per-level table, charts, a comparison of all departments, and a what-if simulator.

All data stays in the user's own browser (localStorage). Nothing is uploaded. Use **Export / Import** (JSON) to keep a copy or move data between devices.



## Python

```bash
pip install ./python
```

```python
from paygap import analyze, Level

levels = [
    Level("R1", 18522, 25189, women=4, men=3, mid=21856),
    Level("R2", 27522, 45622, women=8, men=8, mid=36572),
    Level("R3", 39677, 63250, women=0, men=3, mid=51464),
    Level("R4", 55000, 88555, women=0, men=2, mid=71778),
]
r = analyze(levels, distribution="triangular", reference="mean")
print(r["mean"]["rel"], r["mean"]["confidence"], r["mean"]["label"])
# -0.257  0.98999  Sig
```

It has no dependencies. The Student-t distribution is implemented directly and checked against SciPy in the tests. Run the tests with `python -m pytest python/tests`.

## Method

The method follows the GUM, [JCGM 100:2008 — *Guide to the expression of uncertainty in measurement*](https://doi.org/10.59161/JCGM100-2008E) (BIPM). The uniform distribution is described in §4.3.7 and the triangular distribution in §4.3.9.

- Everyone at a level is assumed to earn the band midpoint. The per-person uncertainty is σ = (max − min)/√24 for a triangular distribution, or /√12 for a uniform one.
- The pay of a group at a level is N × midpoint, with uncertainty N × σ. Uncertainties across levels are added in quadrature.
- Each difference is tested with a two-tailed Student t-test, with DoF = N_women + N_men − 2. Confidence = 1 − p.
- There are three tests: **average pay** (the main measure), **total pay** (which also reflects headcount), and **pay share vs headcount share**.

### Sources
1. [JCGM 100:2008, *Guide to the expression of uncertainty in measurement* (GUM)](https://doi.org/10.59161/JCGM100-2008E), BIPM. Uniform distribution: §4.3.7; triangular distribution: §4.3.9.
2. [Schwarz, W. (2020): *Methoden zur Bestimmung der Messunsicherheit nach GUM – Teil 1*](https://www.gik.kit.edu/downloads/%5BSCHW20%5DGUM_AVN_Teil1.pdf). avn 127(2), 69–86. A German summary; see p. 75 for the uniform and triangular distributions.
3. [Student's t-distribution table](https://www.ttable.org/). The app computes exact p-values instead of using this table.

### Limits
- These are estimates from band midpoints. They only detect gaps caused by how women and men are distributed across levels, not pay differences within a band.
- Groups smaller than about 5 people give unreliable results and may identify individuals.
- Statistical significance does not prove discrimination.

