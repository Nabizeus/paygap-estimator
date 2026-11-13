const I18N = {
en: {
  locale: "en-GB",
  ex_company: "Your Company", ex_dept: "Department {x}",
  app_title: "Pay Gap Estimator",
  app_sub: "Estimate the gender pay gap from salary bands and headcounts. You don't need individual salaries.",
  tab_setup: "1 · Setup", tab_bands: "2 · Salary table", tab_staff: "3 · Headcount", tab_results: "4 · Results", tab_method: "Method",
  language: "Language",
  setup_title: "Organisation and assumptions",
  org: "Organisation", year: "Year", currency: "Currency",
  dist: "Salary distribution within a band",
  dist_tri: "Triangular: most people near the midpoint (recommended)",
  dist_uni: "Uniform: anywhere in the band equally likely (more cautious)",
  ref: "Express gaps relative to",
  ref_mean: "the average of women and men",
  ref_men: "men's pay",
  thresholds: "Significance thresholds (confidence level)",
  th_hi: "Highly significant ≥", th_sig: "Significant ≥", th_mid: "Weakly significant ≥",
  data_title: "Your data",
  data_note: "Everything you enter stays in this browser. Nothing is sent anywhere. Use Export to keep a copy or move it to another device.",
  load_example: "Load example data", start_blank: "Start blank", export: "Export", import: "Import",
  confirm_replace: "This replaces all current data. Continue?", yes: "Yes, replace", cancel: "Cancel",
  bands_title: "Salary table",
  bands_help: "One row per salary level, from lowest to highest. If you leave the midpoint empty, it's calculated as (min + max) / 2.",
  level: "Level", min: "Min", max: "Max", midpoint: "Midpoint", width: "Band width", auto: "auto",
  add_level: "+ Add level", remove: "Remove",
  paste_title: "Paste from Excel",
  paste_help: "Copy the columns Level, Min, Max and, optionally, Midpoint from a spreadsheet and paste them here. This replaces the table.",
  apply: "Apply", err_minmax: "Max must be greater than Min", err_order: "Levels should go from lowest to highest pay",
  staff_title: "Headcount by department",
  staff_help: "Enter how many women and men are at each salary level. Add as many departments as you need.",
  dept: "Department / group", add_dept: "+ Add department", rename: "Rename", duplicate: "Duplicate", delete: "Delete",
  new_dept: "New department", copy_of: "{name} (copy)",
  women: "Women", men: "Men", total: "Total", all: "All",
  w_nolevel: "{level}: only {who} at this level, so the gap can't be tested here.",
  w_small: "{level}: fewer than 5 {who}. Results are uncertain, and individuals could be identified if you share them.",
  w_empty: "Enter at least one woman and one man to see results.",
  results_title: "Results", show: "Show",
  verdict: "Verdict",
  v_lower: "Women's estimated average pay is {pct} lower than men's.",
  v_higher: "Women's estimated average pay is {pct} higher than men's.",
  v_equal: "Women's and men's estimated average pay are the same.",
  v_sig: "This difference is {label} ({conf} confidence), so equal pay is rejected.",
  v_mid: "This difference is only weakly significant ({conf} confidence).",
  v_not: "This difference is not statistically significant ({conf} confidence). It is consistent with equal pay.",
  v_share: "Women are {a} of staff, but {b} of the top {n} level(s).",
  v_total: "The gap in total pay ({pct}) is larger because it also reflects that there are {r}× as many men as women.",
  t_mean: "Average pay", t_mean_d: "Average estimated salary per person. This is the main measure of the pay gap.",
  t_total: "Total pay", t_total_d: "Total salary paid to each group. This reflects both headcount and pay levels.",
  t_ratio: "Pay share vs headcount", t_ratio_d: "Do men receive a larger share of pay than their share of headcount?",
  gap: "Gap", conf: "Confidence", tscore: "t-score", dof: "DoF", favours: "Favours",
  fav_women: "women", fav_men: "men", fav_parity: "parity",
  head_ratio: "Headcount ratio M:W", pay_ratio: "Pay ratio M:W", excess: "Men's excess share",
  per_level: "By level", per_level_d: "Each level tested separately. Levels with only women or only men can't be tested.",
  lvl_pay_w: "Pay women", lvl_pay_m: "Pay men",
  ch_head: "Headcount by level", ch_mean: "Estimated average pay (±1 standard uncertainty)",
  compare_title: "All departments",
  copy_table: "Copy table", copied: "Copied", download: "Download",
  whatif: "What-if",
  whatif_d: "Change the numbers to see how the gap would change, e.g. by promoting women to higher levels. Your data isn't changed until you apply.",
  baseline: "Now", scenario: "Scenario", reset: "Reset", apply_dept: "Apply to department", save_new: "Save as new department",
  scenario_name: "{name}: scenario",
  lab_HiSig: "highly significant", lab_Sig: "significant", lab_MidSig: "weakly significant", lab_NotSig: "not significant", "lab_n/a": "not testable",
  export_title: "Export data", export_help: "Copy this text and keep it somewhere safe. You can paste it back with Import.",
  import_title: "Import data", import_help: "Choose an exported .json file, or paste exported text.",
  import_bad: "That doesn't look like exported data.",
  close: "Close", copy: "Copy",
  example_name: "Example: four-level salary table",
  method_title: "How it works",
  method_html: `<p>Often only a company's <strong>salary table</strong> (minimum and maximum pay for each level) and the <strong>number of women and men</strong> at each level are known. This app estimates whether pay differs by gender from that information alone.</p>
<ol>
<li><strong>Salary per person.</strong> Everyone at a level is assumed to earn the band midpoint. The uncertainty of that assumption follows the GUM (<em>Guide to the Expression of Uncertainty in Measurement</em>): σ = band width / √24 for a triangular distribution, or / √12 for a uniform one.</li>
<li><strong>Pay per group and level.</strong> N × midpoint, with uncertainty N × σ. People in the same band are treated as fully correlated.</li>
<li><strong>Totals.</strong> Pay is summed over levels and uncertainties are added in quadrature: σ<sub>total</sub> = √Σσ²<sub>level</sub>.</li>
<li><strong>Tests.</strong> Each difference is divided by its combined uncertainty to give a Student t-score, with degrees of freedom = N<sub>women</sub> + N<sub>men</sub> − 2. The two-tailed p-value is the probability of reaching the wrong conclusion (Type I error). Confidence = 1 − p.</li>
<li><strong>Pay share vs headcount.</strong> The ratio of men's to women's total pay is compared with the ratio of their headcounts. If men's share of pay is larger than their share of headcount, men are paid more per person.</li>
</ol>
<h3>Limits</h3>
<ul>
<li>Average pay here is an estimate based on band midpoints. It can only show a gap caused by how women and men are spread across levels, not differences in pay within a band.</li>
<li>Small groups (fewer than ~5 people) give unreliable results and may make individuals identifiable.</li>
<li>Statistical significance isn't proof of discrimination. It shows the difference is unlikely to be due to chance under these assumptions.</li>
</ul>
<h3>Sources</h3>
<ol class="src">
<li><a href="https://doi.org/10.59161/JCGM100-2008E" target="_blank" rel="noopener">JCGM 100:2008 — Evaluation of measurement data: Guide to the expression of uncertainty in measurement (GUM)</a>. Joint Committee for Guides in Metrology / BIPM. The uniform (rectangular) distribution is described in section 4.3.7 and the triangular distribution in section 4.3.9. Free to download from the BIPM website.</li>
<li><a href="https://www.gik.kit.edu/downloads/%5BSCHW20%5DGUM_AVN_Teil1.pdf" target="_blank" rel="noopener">Schwarz, W. (2020): Methoden zur Bestimmung der Messunsicherheit nach GUM – Teil 1</a>. avn – Allgemeine Vermessungs-Nachrichten 127(2), 69–86. A German-language summary of the GUM method, including the uniform and triangular distributions (p. 75).</li>
<li><a href="https://www.ttable.org/" target="_blank" rel="noopener">Student's t-distribution table (ttable.org)</a>. Reference table of critical t-values. The app calculates exact two-tailed p-values instead of reading them from a table.</li>
</ol>`
},
es: {
  locale: "es-ES",
  ex_company: "Tu empresa", ex_dept: "Departamento {x}",
  app_title: "Estimador de brecha salarial",
  app_sub: "Estima la brecha salarial de género a partir de las bandas salariales y la plantilla, sin necesidad de salarios individuales.",
  tab_setup: "1 · Configuración", tab_bands: "2 · Tabla salarial", tab_staff: "3 · Plantilla", tab_results: "4 · Resultados", tab_method: "Método",
  language: "Idioma",
  setup_title: "Organización y supuestos",
  org: "Organización", year: "Año", currency: "Moneda",
  dist: "Distribución del salario dentro de una banda",
  dist_tri: "Triangular: la mayoría cerca del punto medio (recomendado)",
  dist_uni: "Uniforme: cualquier punto de la banda es igual de probable (más prudente)",
  ref: "Expresar las brechas respecto a",
  ref_mean: "la media de mujeres y hombres",
  ref_men: "el salario de los hombres",
  thresholds: "Umbrales de significación (nivel de confianza)",
  th_hi: "Altamente significativa ≥", th_sig: "Significativa ≥", th_mid: "Débilmente significativa ≥",
  data_title: "Tus datos",
  data_note: "Todo lo que introduces se queda en este navegador; no se envía a ningún sitio. Usa Exportar para guardar una copia o pasarla a otro dispositivo.",
  load_example: "Cargar datos de ejemplo", start_blank: "Empezar en blanco", export: "Exportar", import: "Importar",
  confirm_replace: "Esto sustituye todos los datos actuales. ¿Continuar?", yes: "Sí, sustituir", cancel: "Cancelar",
  bands_title: "Tabla salarial",
  bands_help: "Una fila por nivel salarial, del más bajo al más alto. Si dejas vacío el punto medio, se calcula como (mín + máx) / 2.",
  level: "Nivel", min: "Mín", max: "Máx", midpoint: "Punto medio", width: "Anchura de banda", auto: "auto",
  add_level: "+ Añadir nivel", remove: "Quitar",
  paste_title: "Pegar desde Excel",
  paste_help: "Copia las columnas Nivel, Mín, Máx (y opcionalmente Punto medio) de una hoja de cálculo y pégalas aquí. Sustituye la tabla.",
  apply: "Aplicar", err_minmax: "Máx debe ser mayor que Mín", err_order: "Los niveles deberían ir del salario más bajo al más alto",
  staff_title: "Plantilla por departamento",
  staff_help: "Indica cuántas mujeres y hombres hay en cada nivel salarial. Añade tantos departamentos como necesites.",
  dept: "Departamento / grupo", add_dept: "+ Añadir departamento", rename: "Renombrar", duplicate: "Duplicar", delete: "Eliminar",
  new_dept: "Nuevo departamento", copy_of: "{name} (copia)",
  women: "Mujeres", men: "Hombres", total: "Total", all: "Todos",
  w_nolevel: "{level}: solo hay {who} en este nivel, así que aquí no se puede evaluar la brecha.",
  w_small: "{level}: menos de 5 {who}. Los resultados son inciertos y, si los compartes, se podría identificar a personas.",
  w_empty: "Introduce al menos una mujer y un hombre para ver resultados.",
  results_title: "Resultados", show: "Mostrar",
  verdict: "Conclusión",
  v_lower: "El salario medio estimado de las mujeres es un {pct} inferior al de los hombres.",
  v_higher: "El salario medio estimado de las mujeres es un {pct} superior al de los hombres.",
  v_equal: "El salario medio estimado de mujeres y hombres es el mismo.",
  v_sig: "La diferencia es {label} ({conf} de confianza): se rechaza la igualdad salarial.",
  v_mid: "La diferencia es solo débilmente significativa ({conf} de confianza).",
  v_not: "La diferencia no es estadísticamente significativa ({conf} de confianza), así que es compatible con la igualdad salarial.",
  v_share: "Las mujeres son el {a} de la plantilla, pero el {b} de los {n} nivel(es) superiores.",
  v_total: "La brecha en la masa salarial total ({pct}) es mayor porque también refleja que hay {r}× más hombres que mujeres.",
  t_mean: "Salario medio", t_mean_d: "Salario estimado por persona: la medida principal de la brecha.",
  t_total: "Masa salarial total", t_total_d: "Salario total de cada grupo: refleja tanto la plantilla como los niveles salariales.",
  t_ratio: "Reparto salarial vs plantilla", t_ratio_d: "¿Reciben los hombres una parte del salario mayor que su parte de la plantilla?",
  gap: "Brecha", conf: "Confianza", tscore: "t", dof: "GdL", favours: "Favorece a",
  fav_women: "mujeres", fav_men: "hombres", fav_parity: "paridad",
  head_ratio: "Ratio plantilla H:M", pay_ratio: "Ratio salarial H:M", excess: "Exceso de los hombres",
  per_level: "Por nivel", per_level_d: "Cada nivel se evalúa por separado. Los niveles con solo mujeres o solo hombres no se pueden evaluar.",
  lvl_pay_w: "Salario mujeres", lvl_pay_m: "Salario hombres",
  ch_head: "Plantilla por nivel", ch_mean: "Salario medio estimado (±1 incertidumbre típica)",
  compare_title: "Todos los departamentos",
  copy_table: "Copiar tabla", copied: "Copiado", download: "Descargar",
  whatif: "Simulación",
  whatif_d: "Cambia las cifras para ver cómo cambiaría la brecha, por ejemplo al promocionar a mujeres a niveles superiores. Tus datos no cambian hasta que apliques.",
  baseline: "Ahora", scenario: "Escenario", reset: "Restablecer", apply_dept: "Aplicar al departamento", save_new: "Guardar como nuevo departamento",
  scenario_name: "{name}: escenario",
  lab_HiSig: "altamente significativa", lab_Sig: "significativa", lab_MidSig: "débilmente significativa", lab_NotSig: "no significativa", "lab_n/a": "no evaluable",
  export_title: "Exportar datos", export_help: "Copia este texto y guárdalo. Puedes volver a pegarlo con Importar.",
  import_title: "Importar datos", import_help: "Elige un archivo .json exportado o pega el texto exportado.",
  import_bad: "No parecen datos exportados.",
  close: "Cerrar", copy: "Copiar",
  example_name: "Ejemplo: tabla salarial de cuatro niveles",
  method_title: "Cómo funciona",
  method_html: `<p>A menudo solo se conoce la <strong>tabla salarial</strong> de una empresa (salario mínimo y máximo de cada nivel) y el <strong>número de mujeres y hombres</strong> en cada nivel. Esta aplicación estima, solo con eso, si el salario difiere según el género.</p>
<ol>
<li><strong>Salario por persona.</strong> Se supone que cada persona de un nivel cobra el punto medio de la banda. La incertidumbre de ese supuesto sigue la GUM (<em>Guía para la expresión de la incertidumbre de medida</em>): σ = anchura de banda / √24 para una distribución triangular, o / √12 para una uniforme.</li>
<li><strong>Salario por grupo y nivel.</strong> N × punto medio, con incertidumbre N × σ (las personas de una misma banda se tratan como totalmente correlacionadas).</li>
<li><strong>Totales.</strong> Se suman los salarios de los niveles y las incertidumbres se combinan en cuadratura: σ<sub>total</sub> = √Σσ²<sub>nivel</sub>.</li>
<li><strong>Pruebas.</strong> Cada diferencia se divide entre su incertidumbre combinada para obtener una t de Student, con grados de libertad = N<sub>mujeres</sub> + N<sub>hombres</sub> − 2. El valor p bilateral es la probabilidad de llegar a una conclusión errónea (error de tipo I); confianza = 1 − p.</li>
<li><strong>Reparto salarial vs plantilla.</strong> Se compara el cociente entre la masa salarial de hombres y mujeres con el cociente de su número. Si los hombres reciben una parte mayor del salario que su parte de la plantilla, cobran más por persona.</li>
</ol>
<h3>Limitaciones</h3>
<ul>
<li>El salario medio es una estimación a partir de los puntos medios: solo puede detectar brechas debidas a cómo se reparten mujeres y hombres entre los niveles, no diferencias dentro de una misma banda.</li>
<li>Los grupos pequeños (menos de ~5 personas) dan resultados poco fiables y pueden permitir identificar a personas.</li>
<li>Que una diferencia sea estadísticamente significativa no prueba discriminación: indica que, con estos supuestos, es poco probable que se deba al azar.</li>
</ul>
<h3>Fuentes</h3>
<ol class="src">
<li><a href="https://doi.org/10.59161/JCGM100-2008E" target="_blank" rel="noopener">JCGM 100:2008 — Evaluation of measurement data: Guide to the expression of uncertainty in measurement (GUM)</a>. Joint Committee for Guides in Metrology / BIPM. La distribución uniforme (rectangular) se describe en el apartado 4.3.7 y la triangular en el 4.3.9. Descarga gratuita en la web del BIPM.</li>
<li><a href="https://www.gik.kit.edu/downloads/%5BSCHW20%5DGUM_AVN_Teil1.pdf" target="_blank" rel="noopener">Schwarz, W. (2020): Methoden zur Bestimmung der Messunsicherheit nach GUM – Teil 1</a>. avn – Allgemeine Vermessungs-Nachrichten 127(2), 69–86. Resumen en alemán del método GUM, con las distribuciones uniforme y triangular (p. 75).</li>
<li><a href="https://www.ttable.org/" target="_blank" rel="noopener">Student's t-distribution table (ttable.org)</a>. Tabla de referencia de valores críticos de t. La aplicación calcula valores p bilaterales exactos en lugar de leerlos de una tabla.</li>
</ol>`
},
ca: {
  locale: "ca-ES",
  ex_company: "La teva empresa", ex_dept: "Departament {x}",
  app_title: "Estimador de bretxa salarial",
  app_sub: "Estima la bretxa salarial de gènere a partir de les bandes salarials i la plantilla, sense necessitat de salaris individuals.",
  tab_setup: "1 · Configuració", tab_bands: "2 · Taula salarial", tab_staff: "3 · Plantilla", tab_results: "4 · Resultats", tab_method: "Mètode",
  language: "Idioma",
  setup_title: "Organització i supòsits",
  org: "Organització", year: "Any", currency: "Moneda",
  dist: "Distribució del salari dins d'una banda",
  dist_tri: "Triangular: la majoria a prop del punt mitjà (recomanat)",
  dist_uni: "Uniforme: qualsevol punt de la banda és igual de probable (més prudent)",
  ref: "Expressar les bretxes respecte a",
  ref_mean: "la mitjana de dones i homes",
  ref_men: "el salari dels homes",
  thresholds: "Llindars de significació (nivell de confiança)",
  th_hi: "Altament significativa ≥", th_sig: "Significativa ≥", th_mid: "Feblement significativa ≥",
  data_title: "Les teves dades",
  data_note: "Tot el que introdueixes es queda en aquest navegador; no s'envia enlloc. Fes servir Exportar per desar-ne una còpia o passar-la a un altre dispositiu.",
  load_example: "Carregar dades d'exemple", start_blank: "Començar en blanc", export: "Exportar", import: "Importar",
  confirm_replace: "Això substitueix totes les dades actuals. Vols continuar?", yes: "Sí, substituir", cancel: "Cancel·lar",
  bands_title: "Taula salarial",
  bands_help: "Una fila per nivell salarial, del més baix al més alt. Si deixes el punt mitjà buit, es calcula com (mín + màx) / 2.",
  level: "Nivell", min: "Mín", max: "Màx", midpoint: "Punt mitjà", width: "Amplada de banda", auto: "auto",
  add_level: "+ Afegir nivell", remove: "Treure",
  paste_title: "Enganxar des d'Excel",
  paste_help: "Copia les columnes Nivell, Mín, Màx (i opcionalment Punt mitjà) d'un full de càlcul i enganxa-les aquí. Substitueix la taula.",
  apply: "Aplicar", err_minmax: "Màx ha de ser més gran que Mín", err_order: "Els nivells haurien d'anar del salari més baix al més alt",
  staff_title: "Plantilla per departament",
  staff_help: "Indica quantes dones i homes hi ha a cada nivell salarial. Afegeix tants departaments com necessitis.",
  dept: "Departament / grup", add_dept: "+ Afegir departament", rename: "Canviar el nom", duplicate: "Duplicar", delete: "Eliminar",
  new_dept: "Nou departament", copy_of: "{name} (còpia)",
  women: "Dones", men: "Homes", total: "Total", all: "Tots",
  w_nolevel: "{level}: només hi ha {who} en aquest nivell, així que aquí no es pot avaluar la bretxa.",
  w_small: "{level}: menys de 5 {who}. Els resultats són incerts i, si els comparteixes, es podria identificar persones.",
  w_empty: "Introdueix almenys una dona i un home per veure resultats.",
  results_title: "Resultats", show: "Mostrar",
  verdict: "Conclusió",
  v_lower: "El salari mitjà estimat de les dones és un {pct} inferior al dels homes.",
  v_higher: "El salari mitjà estimat de les dones és un {pct} superior al dels homes.",
  v_equal: "El salari mitjà estimat de dones i homes és el mateix.",
  v_sig: "La diferència és {label} ({conf} de confiança): es rebutja la igualtat salarial.",
  v_mid: "La diferència només és feblement significativa ({conf} de confiança).",
  v_not: "La diferència no és estadísticament significativa ({conf} de confiança), així que és compatible amb la igualtat salarial.",
  v_share: "Les dones són el {a} de la plantilla, però el {b} dels {n} nivell(s) superiors.",
  v_total: "La bretxa en la massa salarial total ({pct}) és més gran perquè també reflecteix que hi ha {r}× més homes que dones.",
  t_mean: "Salari mitjà", t_mean_d: "Salari estimat per persona: la mesura principal de la bretxa.",
  t_total: "Massa salarial total", t_total_d: "Salari total de cada grup: reflecteix tant la plantilla com els nivells salarials.",
  t_ratio: "Repartiment salarial vs plantilla", t_ratio_d: "Reben els homes una part del salari més gran que la seva part de la plantilla?",
  gap: "Bretxa", conf: "Confiança", tscore: "t", dof: "GdL", favours: "Afavoreix",
  fav_women: "dones", fav_men: "homes", fav_parity: "paritat",
  head_ratio: "Ràtio plantilla H:D", pay_ratio: "Ràtio salarial H:D", excess: "Excés dels homes",
  per_level: "Per nivell", per_level_d: "Cada nivell s'avalua per separat. Els nivells amb només dones o només homes no es poden avaluar.",
  lvl_pay_w: "Salari dones", lvl_pay_m: "Salari homes",
  ch_head: "Plantilla per nivell", ch_mean: "Salari mitjà estimat (±1 incertesa típica)",
  compare_title: "Tots els departaments",
  copy_table: "Copiar taula", copied: "Copiat", download: "Descarregar",
  whatif: "Simulació",
  whatif_d: "Canvia les xifres per veure com canviaria la bretxa, per exemple en promocionar dones a nivells superiors. Les teves dades no canvien fins que apliquis.",
  baseline: "Ara", scenario: "Escenari", reset: "Restablir", apply_dept: "Aplicar al departament", save_new: "Desar com a nou departament",
  scenario_name: "{name}: escenari",
  lab_HiSig: "altament significativa", lab_Sig: "significativa", lab_MidSig: "feblement significativa", lab_NotSig: "no significativa", "lab_n/a": "no avaluable",
  export_title: "Exportar dades", export_help: "Copia aquest text i desa'l. El pots tornar a enganxar amb Importar.",
  import_title: "Importar dades", import_help: "Tria un fitxer .json exportat o enganxa el text exportat.",
  import_bad: "No semblen dades exportades.",
  close: "Tancar", copy: "Copiar",
  example_name: "Exemple: taula salarial de quatre nivells",
  method_title: "Com funciona",
  method_html: `<p>Sovint només es coneix la <strong>taula salarial</strong> d'una empresa (salari mínim i màxim de cada nivell) i el <strong>nombre de dones i homes</strong> a cada nivell. Aquesta aplicació estima, només amb això, si el salari és diferent segons el gènere.</p>
<ol>
<li><strong>Salari per persona.</strong> Se suposa que cada persona d'un nivell cobra el punt mitjà de la banda. La incertesa d'aquest supòsit segueix la GUM (<em>Guia per a l'expressió de la incertesa de mesura</em>): σ = amplada de banda / √24 per a una distribució triangular, o / √12 per a una uniforme.</li>
<li><strong>Salari per grup i nivell.</strong> N × punt mitjà, amb incertesa N × σ (les persones d'una mateixa banda es tracten com a totalment correlacionades).</li>
<li><strong>Totals.</strong> Se sumen els salaris dels nivells i les incerteses es combinen en quadratura: σ<sub>total</sub> = √Σσ²<sub>nivell</sub>.</li>
<li><strong>Proves.</strong> Cada diferència es divideix per la seva incertesa combinada per obtenir una t de Student, amb graus de llibertat = N<sub>dones</sub> + N<sub>homes</sub> − 2. El valor p bilateral és la probabilitat d'arribar a una conclusió errònia (error de tipus I); confiança = 1 − p.</li>
<li><strong>Repartiment salarial vs plantilla.</strong> Es compara el quocient entre la massa salarial d'homes i dones amb el quocient del seu nombre. Si els homes reben una part del salari més gran que la seva part de la plantilla, cobren més per persona.</li>
</ol>
<h3>Limitacions</h3>
<ul>
<li>El salari mitjà és una estimació a partir dels punts mitjans: només pot detectar bretxes degudes a com es reparteixen dones i homes entre els nivells, no diferències dins d'una mateixa banda.</li>
<li>Els grups petits (menys de ~5 persones) donen resultats poc fiables i poden permetre identificar persones.</li>
<li>Que una diferència sigui estadísticament significativa no prova discriminació: indica que, amb aquests supòsits, és poc probable que sigui fruit de l'atzar.</li>
</ul>
<h3>Fonts</h3>
<ol class="src">
<li><a href="https://doi.org/10.59161/JCGM100-2008E" target="_blank" rel="noopener">JCGM 100:2008 — Evaluation of measurement data: Guide to the expression of uncertainty in measurement (GUM)</a>. Joint Committee for Guides in Metrology / BIPM. La distribució uniforme (rectangular) es descriu a l'apartat 4.3.7 i la triangular al 4.3.9. Descàrrega gratuïta al web del BIPM.</li>
<li><a href="https://www.gik.kit.edu/downloads/%5BSCHW20%5DGUM_AVN_Teil1.pdf" target="_blank" rel="noopener">Schwarz, W. (2020): Methoden zur Bestimmung der Messunsicherheit nach GUM – Teil 1</a>. avn – Allgemeine Vermessungs-Nachrichten 127(2), 69–86. Resum en alemany del mètode GUM, amb les distribucions uniforme i triangular (p. 75).</li>
<li><a href="https://www.ttable.org/" target="_blank" rel="noopener">Student's t-distribution table (ttable.org)</a>. Taula de referència de valors crítics de t. L'aplicació calcula valors p bilaterals exactes en lloc de llegir-los d'una taula.</li>
</ol>`
},
de: {
  locale: "de-DE",
  ex_company: "Ihr Unternehmen", ex_dept: "Abteilung {x}",
  app_title: "Entgeltlücken-Schätzer",
  app_sub: "Schätzt die geschlechtsspezifische Entgeltlücke anhand von Gehaltsbändern und Personalzahlen. Einzelgehälter sind nicht nötig.",
  tab_setup: "1 · Einstellungen", tab_bands: "2 · Gehaltstabelle", tab_staff: "3 · Personal", tab_results: "4 · Ergebnisse", tab_method: "Methode",
  language: "Sprache",
  setup_title: "Organisation und Annahmen",
  org: "Organisation", year: "Jahr", currency: "Währung",
  dist: "Gehaltsverteilung innerhalb eines Bandes",
  dist_tri: "Dreieckig: die meisten nahe der Bandmitte (empfohlen)",
  dist_uni: "Gleichverteilt: jeder Wert im Band gleich wahrscheinlich (vorsichtiger)",
  ref: "Lücken angeben im Verhältnis zu",
  ref_mean: "dem Mittel von Frauen und Männern",
  ref_men: "dem Gehalt der Männer",
  thresholds: "Signifikanzschwellen (Konfidenzniveau)",
  th_hi: "Hoch signifikant ≥", th_sig: "Signifikant ≥", th_mid: "Schwach signifikant ≥",
  data_title: "Ihre Daten",
  data_note: "Alles, was Sie eingeben, bleibt in diesem Browser. Es wird nichts übertragen. Mit „Exportieren“ können Sie eine Kopie sichern oder auf ein anderes Gerät übertragen.",
  load_example: "Beispieldaten laden", start_blank: "Leer beginnen", export: "Exportieren", import: "Importieren",
  confirm_replace: "Dadurch werden alle aktuellen Daten ersetzt. Fortfahren?", yes: "Ja, ersetzen", cancel: "Abbrechen",
  bands_title: "Gehaltstabelle",
  bands_help: "Eine Zeile pro Gehaltsstufe, von der niedrigsten zur höchsten. Bleibt die Bandmitte leer, wird sie als (Min + Max) / 2 berechnet.",
  level: "Stufe", min: "Min", max: "Max", midpoint: "Bandmitte", width: "Bandbreite", auto: "auto",
  add_level: "+ Stufe hinzufügen", remove: "Entfernen",
  paste_title: "Aus Excel einfügen",
  paste_help: "Kopieren Sie die Spalten Stufe, Min, Max und optional Bandmitte aus einer Tabelle und fügen Sie sie hier ein. Die Tabelle wird ersetzt.",
  apply: "Übernehmen", err_minmax: "Max muss größer als Min sein", err_order: "Die Stufen sollten vom niedrigsten zum höchsten Gehalt sortiert sein",
  staff_title: "Personal nach Abteilung",
  staff_help: "Geben Sie an, wie viele Frauen und Männer in jeder Gehaltsstufe sind. Fügen Sie so viele Abteilungen hinzu, wie Sie brauchen.",
  dept: "Abteilung / Gruppe", add_dept: "+ Abteilung hinzufügen", rename: "Umbenennen", duplicate: "Duplizieren", delete: "Löschen",
  new_dept: "Neue Abteilung", copy_of: "{name} (Kopie)",
  women: "Frauen", men: "Männer", total: "Gesamt", all: "Alle",
  w_nolevel: "{level}: Auf dieser Stufe gibt es nur {who}, daher lässt sich die Lücke hier nicht testen.",
  w_small: "{level}: weniger als 5 {who}. Die Ergebnisse sind unsicher, und einzelne Personen könnten erkennbar sein, wenn Sie sie weitergeben.",
  w_empty: "Geben Sie mindestens eine Frau und einen Mann ein, um Ergebnisse zu sehen.",
  results_title: "Ergebnisse", show: "Anzeigen",
  verdict: "Fazit",
  v_lower: "Das geschätzte Durchschnittsgehalt der Frauen liegt {pct} unter dem der Männer.",
  v_higher: "Das geschätzte Durchschnittsgehalt der Frauen liegt {pct} über dem der Männer.",
  v_equal: "Das geschätzte Durchschnittsgehalt von Frauen und Männern ist gleich.",
  v_sig: "Der Unterschied ist {label} ({conf} Konfidenz), daher wird Entgeltgleichheit verworfen.",
  v_mid: "Der Unterschied ist nur schwach signifikant ({conf} Konfidenz).",
  v_not: "Der Unterschied ist statistisch nicht signifikant ({conf} Konfidenz). Er ist mit Entgeltgleichheit vereinbar.",
  v_share: "Frauen machen {a} des Personals aus, aber nur {b} der obersten {n} Stufe(n).",
  v_total: "Die Lücke bei der Gesamtvergütung ({pct}) ist größer, weil sie auch widerspiegelt, dass es {r}× so viele Männer wie Frauen gibt.",
  t_mean: "Durchschnittsgehalt", t_mean_d: "Geschätztes Gehalt pro Person. Das ist das wichtigste Maß für die Entgeltlücke.",
  t_total: "Gesamtvergütung", t_total_d: "Gesamtes Gehalt jeder Gruppe. Es spiegelt sowohl Personalzahl als auch Gehaltsniveau wider.",
  t_ratio: "Gehaltsanteil vs. Personalanteil", t_ratio_d: "Erhalten Männer einen größeren Anteil am Gehalt als an der Belegschaft?",
  gap: "Lücke", conf: "Konfidenz", tscore: "t-Wert", dof: "FG", favours: "Zugunsten von",
  fav_women: "Frauen", fav_men: "Männern", fav_parity: "Parität",
  head_ratio: "Personalverhältnis M:F", pay_ratio: "Gehaltsverhältnis M:F", excess: "Mehranteil der Männer",
  per_level: "Nach Stufe", per_level_d: "Jede Stufe wird einzeln getestet. Stufen mit nur Frauen oder nur Männern lassen sich nicht testen.",
  lvl_pay_w: "Gehalt Frauen", lvl_pay_m: "Gehalt Männer",
  ch_head: "Personal nach Stufe", ch_mean: "Geschätztes Durchschnittsgehalt (±1 Standardunsicherheit)",
  compare_title: "Alle Abteilungen",
  copy_table: "Tabelle kopieren", copied: "Kopiert", download: "Herunterladen",
  whatif: "Was-wäre-wenn",
  whatif_d: "Ändern Sie die Zahlen, um zu sehen, wie sich die Lücke verändern würde, z. B. wenn Frauen in höhere Stufen befördert werden. Ihre Daten ändern sich erst, wenn Sie übernehmen.",
  baseline: "Aktuell", scenario: "Szenario", reset: "Zurücksetzen", apply_dept: "Auf Abteilung anwenden", save_new: "Als neue Abteilung speichern",
  scenario_name: "{name}: Szenario",
  lab_HiSig: "hoch signifikant", lab_Sig: "signifikant", lab_MidSig: "schwach signifikant", lab_NotSig: "nicht signifikant", "lab_n/a": "nicht testbar",
  export_title: "Daten exportieren", export_help: "Kopieren Sie diesen Text und bewahren Sie ihn sicher auf. Mit „Importieren“ können Sie ihn wieder einfügen.",
  import_title: "Daten importieren", import_help: "Wählen Sie eine exportierte .json-Datei oder fügen Sie exportierten Text ein.",
  import_bad: "Das sieht nicht nach exportierten Daten aus.",
  close: "Schließen", copy: "Kopieren",
  example_name: "Beispiel: Gehaltstabelle mit vier Stufen",
  method_title: "So funktioniert es",
  method_html: `<p>Oft sind von einem Unternehmen nur die <strong>Gehaltstabelle</strong> (Mindest- und Höchstgehalt je Stufe) und die <strong>Anzahl der Frauen und Männer</strong> je Stufe bekannt. Diese App schätzt allein daraus, ob sich die Bezahlung nach Geschlecht unterscheidet.</p>
<ol>
<li><strong>Gehalt pro Person.</strong> Für alle Personen einer Stufe wird die Bandmitte angenommen. Die Unsicherheit dieser Annahme folgt dem GUM (<em>Leitfaden zur Angabe der Unsicherheit beim Messen</em>): σ = Bandbreite / √24 bei Dreiecksverteilung bzw. / √12 bei Gleichverteilung.</li>
<li><strong>Gehalt pro Gruppe und Stufe.</strong> N × Bandmitte, mit Unsicherheit N × σ. Personen im selben Band gelten als vollständig korreliert.</li>
<li><strong>Summen.</strong> Die Gehälter werden über die Stufen addiert, die Unsicherheiten quadratisch kombiniert: σ<sub>gesamt</sub> = √Σσ²<sub>Stufe</sub>.</li>
<li><strong>Tests.</strong> Jeder Unterschied wird durch seine kombinierte Unsicherheit geteilt. Das ergibt einen Student-t-Wert mit Freiheitsgraden = N<sub>Frauen</sub> + N<sub>Männer</sub> − 2. Der zweiseitige p-Wert ist die Wahrscheinlichkeit eines Fehlschlusses (Fehler 1. Art). Konfidenz = 1 − p.</li>
<li><strong>Gehaltsanteil vs. Personalanteil.</strong> Das Verhältnis der Gesamtvergütung von Männern zu Frauen wird mit dem Verhältnis ihrer Personalzahlen verglichen. Ist der Gehaltsanteil der Männer größer als ihr Personalanteil, verdienen sie pro Kopf mehr.</li>
</ol>
<h3>Grenzen</h3>
<ul>
<li>Das Durchschnittsgehalt ist eine Schätzung auf Basis der Bandmitten. Es zeigt nur Lücken, die durch die Verteilung von Frauen und Männern auf die Stufen entstehen, nicht Unterschiede innerhalb eines Bandes.</li>
<li>Kleine Gruppen (unter ~5 Personen) liefern unzuverlässige Ergebnisse und können einzelne Personen erkennbar machen.</li>
<li>Statistische Signifikanz ist kein Beweis für Diskriminierung. Sie zeigt nur, dass der Unterschied unter diesen Annahmen wahrscheinlich nicht zufällig ist.</li>
</ul>
<h3>Quellen</h3>
<ol class="src">
<li><a href="https://doi.org/10.59161/JCGM100-2008E" target="_blank" rel="noopener">JCGM 100:2008 — Evaluation of measurement data: Guide to the expression of uncertainty in measurement (GUM)</a>. Joint Committee for Guides in Metrology / BIPM. Die Gleich- (Rechteck-)verteilung wird in Abschnitt 4.3.7 beschrieben, die Dreiecksverteilung in Abschnitt 4.3.9. Kostenloser Download auf der Website des BIPM.</li>
<li><a href="https://www.gik.kit.edu/downloads/%5BSCHW20%5DGUM_AVN_Teil1.pdf" target="_blank" rel="noopener">Schwarz, W. (2020): Methoden zur Bestimmung der Messunsicherheit nach GUM – Teil 1</a>. avn – Allgemeine Vermessungs-Nachrichten 127(2), 69–86. Deutschsprachige Zusammenfassung der GUM-Methode, einschließlich Gleich- und Dreiecksverteilung (S. 75).</li>
<li><a href="https://www.ttable.org/" target="_blank" rel="noopener">Student's t-distribution table (ttable.org)</a>. Referenztabelle kritischer t-Werte. Die App berechnet exakte zweiseitige p-Werte, statt sie aus einer Tabelle abzulesen.</li>
</ol>`
}
};
