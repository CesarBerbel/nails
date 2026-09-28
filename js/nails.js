/* =========================================================
   Desenho das unhas — compartilhado entre o site e o painel
   ========================================================= */

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  return "#" + [f(r), f(g), f(b)].map((c) => c.toString(16).padStart(2, "0")).join("");
}
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}
/** Distância perceptual (OKLab) entre duas cores hex. */
function colorDistance(a, b) {
  const lab = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const r = lin(n >> 16), g = lin((n >> 8) & 255), bl = lin(n & 255);
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
            1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const [l1, a1, b1] = lab(a), [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100;
}
/** Item mais parecido de uma lista de { hex } (ou null). */
function nearestColor(hex, list) {
  let best = null, dist = Infinity;
  for (const it of list) {
    const d = colorDistance(hex, it.hex);
    if (d < dist) { dist = d; best = it; }
  }
  return best ? { ...best, distance: dist } : null;
}
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

const SHAPES = {
  amendoada: { label: "Amendoada", d: "M-30,120 L-30,55 C-30,25 -10,-8 0,-12 C10,-8 30,25 30,55 L30,120 Q0,138 -30,120 Z", tip: 28 },
  bailarina: { label: "Bailarina", d: "M-30,120 L-30,60 L-16,-14 L16,-14 L30,60 L30,120 Q0,138 -30,120 Z", tip: 22 },
  stiletto: { label: "Stiletto", d: "M-30,120 L-30,65 C-30,35 -6,-10 0,-40 C6,-10 30,35 30,65 L30,120 Q0,138 -30,120 Z", tip: 22 },
  quadrada: { label: "Quadrada", d: "M-30,120 L-30,14 Q-30,6 -22,6 L22,6 Q30,6 30,14 L30,120 Q0,138 -30,120 Z", tip: 30 },
  redonda: { label: "Redonda", d: "M-30,120 L-30,40 Q-30,5 0,5 Q30,5 30,40 L30,120 Q0,138 -30,120 Z", tip: 30 },
  curta: { label: "Curtinha", d: "M-30,120 L-30,52 Q-30,30 0,30 Q30,30 30,52 L30,120 Q0,138 -30,120 Z", tip: 46 },
};
const FINISHES = { brilho: "Brilho", fosco: "Fosco", glitter: "Glitter", francesinha: "Francesinha", cromado: "Cromado", ombre: "Ombré" };
const SKINS = ["#F6D5C3", "#E8B896", "#C98E6B", "#9A6446", "#6B4130"];
// Paleta da Helen, usada quando o Supabase não está configurado (no banco é editável pelo painel)
const DEFAULT_PALETTE = [
  ["Rosa Helen", "#E8588A"], ["Rosa bebé", "#F9C6D6"], ["Nude", "#E7B9A6"], ["Chocolate", "#5A2E1E"],
  ["Vermelho", "#C8102E"], ["Vinho", "#6D1A36"], ["Lilás", "#B79CE0"], ["Azul bebé", "#A9D3F0"],
  ["Menta", "#A8E0C8"], ["Branco", "#FAFAFA"], ["Preto", "#1E1A1C"], ["Dourado", "#D4AF37"],
].map(([name, hex], i) => ({ id: null, name, hex, sort: i + 1, polish_label: null, polish_in_stock: false }));

const FINGERS = [
  { t: "translate(85,125) rotate(-12) scale(.78)" },
  { t: "translate(178,72) rotate(-5) scale(.92)", accent: true },
  { t: "translate(270,50) scale(1)" },
  { t: "translate(362,72) rotate(6) scale(.94)" },
  { t: "translate(458,160) rotate(18) scale(.9)" },
];
const HEART = "M0,84 C-15,73 -15,57 -6,57 C-2,57 0,61 0,63 C0,61 2,57 6,57 C15,57 15,73 0,84 Z";

let uidCounter = 0;
/** Gera o SVG (conteúdo interno, viewBox 0 0 520 380) de uma mão com o design aplicado. */
function handMarkup(d, { animate = false } = {}) {
  const id = "n" + ++uidCounter;
  const shape = SHAPES[d.shape] || SHAPES.amendoada;
  const skin = d.skin || SKINS[0];
  const edge = shade(d.color, -0.22);
  const heartColor = luminance(d.color) > 0.72 ? "#E8588A" : "#FFFFFF";
  const nude = "#F6D3D0";

  const defs = `
    <defs>
      <clipPath id="c-${id}" clipPathUnits="userSpaceOnUse"><path d="${shape.d}"/></clipPath>
      <pattern id="g-${id}" width="12" height="12" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="3" r="1.3" fill="#fff" opacity=".95"/><circle cx="9" cy="7" r="1" fill="#fff" opacity=".7"/>
        <circle cx="5" cy="10.5" r=".8" fill="#FFE3EC"/><circle cx="10.5" cy="1.5" r=".6" fill="#fff"/>
      </pattern>
      <linearGradient id="ch-${id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/>
        <stop offset=".62" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="o-${id}" x1="0" y1="125" x2="0" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="${nude}"/><stop offset=".3" stop-color="${nude}"/><stop offset="1" stop-color="${d.color}"/>
      </linearGradient>
      <linearGradient id="s-${id}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${shade(skin, -0.12)}"/><stop offset=".4" stop-color="${skin}"/>
        <stop offset=".75" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -0.14)}"/>
      </linearGradient>
      <filter id="sh-${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#5A2E1E" flood-opacity=".16"/>
      </filter>
    </defs>`;

  const fingers = FINGERS.map((f, i) => {
    const isAccent = d.accent && f.accent;
    let baseFill = d.color;
    if (d.finish === "francesinha") baseFill = nude;
    if (d.finish === "ombre") baseFill = `url(#o-${id})`;

    let layers = "";
    if (d.finish === "francesinha") {
      const T = shape.tip;
      layers += `<path d="M-40,-60 L40,-60 L40,${T} Q0,${T + 20} -40,${T} Z" fill="${d.color}"/>`;
    }
    if (d.finish === "glitter" || isAccent) layers += `<rect x="-40" y="-60" width="80" height="200" fill="url(#g-${id})" opacity="${isAccent && d.finish !== "glitter" ? 0.55 : 1}"/>`;
    if (d.finish === "cromado") layers += `<rect x="-40" y="-60" width="80" height="200" fill="url(#ch-${id})"/>`;
    if (d.finish === "fosco") layers += `<rect x="-40" y="-60" width="80" height="200" fill="#fff" opacity=".07"/>`;
    else layers += `<path d="M-19,104 C-23,78 -22,50 -13,30" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity="${d.finish === "cromado" ? 0.85 : 0.5}"/>
                    <circle cx="-8" cy="22" r="2.4" fill="#fff" opacity=".55"/>`;
    if (isAccent) layers += `<path d="${HEART}" fill="${heartColor}" transform="translate(0,-4)"/>`;

    return `
      <g transform="${f.t}">
        <g class="finger" ${animate ? `style="animation:nailPop .55s ${i * 0.06}s backwards"` : ""}>
          <path d="M-40,440 L-40,82 C-40,46 -22,36 0,36 C22,36 40,46 40,82 L40,440 Z" fill="url(#s-${id})"/>
          <g filter="url(#sh-${id})">
            <path d="${shape.d}" fill="${baseFill}" stroke="${d.finish === "francesinha" ? shade(nude, -0.15) : edge}" stroke-width="1.2" class="nail-fill"/>
            <g clip-path="url(#c-${id})">${layers}</g>
          </g>
          <path d="M-33,123 Q0,146 33,123" stroke="${shade(skin, -0.2)}" stroke-width="2" fill="none" opacity=".55" stroke-linecap="round"/>
        </g>
      </g>`;
  }).join("");

  return defs + fingers;
}
