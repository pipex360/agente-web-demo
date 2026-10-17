// Control de calidad sobre el build. Bloquea (exit 1) si encuentra algo.
// Uso: node scripts/verificar.mjs dist
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const raiz = process.argv[2] || 'dist';
const base = (process.env.BASE_URL || '/').replace(/\/?$/, '/');
const errores = [];

const html = [];
(function recorrer(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) recorrer(p);
    else if (p.endsWith('.html')) html.push(p);
  }
})(raiz);

// Frases de relleno o con tono de IA que no pueden llegar a una web publicada.
const PROHIBIDAS = [
  /lorem ipsum/i, /\bTODO\b/, /\bplaceholder\b/i, /\bexample\.com\b/,
  /no es solo .{1,40}, es /i, /en el mundo actual/i, /lleva(r)? tu negocio al siguiente nivel/i,
  /soluciones innovadoras/i, /desbloquea/i, /potencia tu/i, /revoluciona/i,
];

for (const archivo of html) {
  const rel = relative(raiz, archivo);
  const src = readFileSync(archivo, 'utf8');
  const texto = src.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');

  if (rel.startsWith('404')) continue;
  if (!/<title>[^<]{10,}<\/title>/.test(src)) errores.push(`${rel}: <title> vacío o muy corto`);
  if (!/<meta name="description" content="[^"]{50,}"/.test(src)) errores.push(`${rel}: meta description ausente o < 50 caracteres`);
  if ((src.match(/<h1[\s>]/g) || []).length !== 1) errores.push(`${rel}: debe tener exactamente un <h1>`);
  for (const m of src.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g)) errores.push(`${rel}: <img> sin alt → ${m[0].slice(0, 80)}`);
  if (/…|\.\.\.<\//.test(texto)) errores.push(`${rel}: texto truncado con «…»`);
  for (const re of PROHIBIDAS) if (re.test(texto)) errores.push(`${rel}: frase prohibida ${re}`);

  // Enlaces internos rotos
  for (const [, href] of src.matchAll(/href="([^"#?]+)/g)) {
    if (!href.startsWith(base) || href.startsWith('//')) continue;
    const ruta = join(raiz, href.slice(base.length));
    const ok = existsSync(ruta) && (statSync(ruta).isFile() || existsSync(join(ruta, 'index.html')));
    if (!ok) errores.push(`${rel}: enlace interno roto ${href}`);
  }
}

// og.png bloquea sólo en producción; en la preview avisa.
if (!existsSync(join(raiz, 'og.png'))) {
  const msg = 'falta public/og.png (imagen para compartir 1200×630)';
  if (process.env.PUBLIC_NOINDEX === '1') console.warn('⚠ ' + msg); else errores.push(msg);
}

if (errores.length) {
  console.error(`✗ ${errores.length} problema(s):\n- ` + [...new Set(errores)].join('\n- '));
  process.exit(1);
}
console.log(`✓ ${html.length} página(s) sin problemas`);
