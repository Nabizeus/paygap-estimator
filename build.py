import pathlib
src=pathlib.Path(__file__).parent/'src'
html=f'''<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pay Gap Estimator</title>
<style>{(src/'style.css').read_text()}</style></head>
<body><div class="wrap" id="app"></div>
<script>{(src/'calc.js').read_text()}</script>
<script>{(src/'i18n.js').read_text()}</script>
<script>{(src/'app.js').read_text()}</script>
</body></html>'''
out=pathlib.Path(__file__).parent/'index.html'; out.write_text(html); print(out, len(html))
