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
  amendoada: { label: "Amendoada", en: "Almond", d: "M-30,120 L-30,55 C-30,25 -10,-8 0,-12 C10,-8 30,25 30,55 L30,120 Q0,138 -30,120 Z", tip: 28 },
  bailarina: { label: "Bailarina", en: "Coffin", d: "M-30,120 L-30,60 L-16,-14 L16,-14 L30,60 L30,120 Q0,138 -30,120 Z", tip: 22 },
  stiletto: { label: "Stiletto", en: "Stiletto", d: "M-30,120 L-30,65 C-30,35 -6,-10 0,-40 C6,-10 30,35 30,65 L30,120 Q0,138 -30,120 Z", tip: 22 },
  quadrada: { label: "Quadrada", en: "Square", d: "M-30,120 L-30,14 Q-30,6 -22,6 L22,6 Q30,6 30,14 L30,120 Q0,138 -30,120 Z", tip: 30 },
  redonda: { label: "Redonda", en: "Round", d: "M-30,120 L-30,40 Q-30,5 0,5 Q30,5 30,40 L30,120 Q0,138 -30,120 Z", tip: 30 },
  curta: { label: "Curtinha", en: "Short", d: "M-30,120 L-30,52 Q-30,30 0,30 Q30,30 30,52 L30,120 Q0,138 -30,120 Z", tip: 46 },
};
const FINISHES = { brilho: "Brilho", fosco: "Fosco", glitter: "Glitter", francesinha: "Francesinha", cromado: "Cromado", ombre: "Ombré" };
const FINISHES_EN = { brilho: "Glossy", fosco: "Matte", glitter: "Glitter", francesinha: "French", cromado: "Chrome", ombre: "Ombré" };
const SKINS = ["#F6D5C3", "#E8B896", "#C98E6B", "#9A6446", "#6B4130"];
// Paleta da Helen, usada quando o Supabase não está configurado (no banco é editável pelo painel)
const DEFAULT_PALETTE = [
  ["Rosa Helen", "#E8588A"], ["Rosa bebé", "#F9C6D6"], ["Nude", "#E7B9A6"], ["Chocolate", "#5A2E1E"],
  ["Vermelho", "#C8102E"], ["Vinho", "#6D1A36"], ["Lilás", "#B79CE0"], ["Azul bebé", "#A9D3F0"],
  ["Menta", "#A8E0C8"], ["Branco", "#FAFAFA"], ["Preto", "#1E1A1C"], ["Dourado", "#D4AF37"],
].map(([name, hex], i) => ({ id: null, name, hex, sort: i + 1, polish_label: null, polish_in_stock: false }));

/* ---------- mão em fotografia ----------
   Foto provisória: Chelson Tamares / Unsplash (licença Unsplash, uso comercial livre).
   Para trocar pela foto da Helen basta substituir assets/maos/mao.jpg (1040×760) e
   voltar a medir as unhas em NAILS.
   Cada unha é desenhada num sistema local: largura x -30..30, base (cutícula) em y≈129 e
   a ponta para cima. A transformação encaixa o formato "curtinha" exatamente sobre a unha
   natural da foto; os formatos mais compridos prolongam-se para lá dela. */
const HAND_PHOTO = "/assets/maos/mao.jpg"; // caminho absoluto: serve também a versão /en/
const PHOTO_SKIN = "#E8B896"; // tom de pele da fotografia original
const NAILS = [
  { name: "polegar", t: "translate(34.5,165.3) rotate(101.6) scale(0.867,0.839) translate(0,-129)" },
  { name: "indicador", t: "translate(202.4,245.9) rotate(-175.4) scale(0.619,0.847) translate(0,-129)" },
  { name: "medio", t: "translate(277.1,268.2) rotate(175.7) scale(0.588,0.809) translate(0,-129)" },
  { name: "anelar", t: "translate(352.1,225.8) rotate(164.5) scale(0.495,0.732) translate(0,-129)", accent: true },
  // unhas desfocadas na foto (fora do plano de foco)
  { name: "mindinho", t: "translate(378.9,176.4) rotate(145.6) scale(0.285,0.332) translate(0,-129)", blur: 1.2 },
  { name: "baixo1", t: "translate(409.7,357.3) rotate(103.3) scale(0.384,0.586) translate(0,-129)", blur: 1.2 },
  { name: "baixo2", t: "translate(502.2,312.7) rotate(135.0) scale(0.340,0.361) translate(0,-129)", blur: 1.2 },
];
const HEART = "M0,84 C-15,73 -15,57 -6,57 C-2,57 0,61 0,63 C0,61 2,57 6,57 C15,57 15,73 0,84 Z";

const rgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };

// máscara da pele (branco = pele) feita à medida da foto: inclui os realces claros dos dedos,
// que pela cor se confundiam com o fundo e ficavam por pintar nos tons escuros
const HAND_SKIN_MASK = "/assets/maos/mao-pele.png";

/** Filtro + máscara que mudam o tom da pele da foto: multiplicam cada canal só onde há pele. */
function skinToneFilter(id, skin) {
  if (skin.toLowerCase() === PHOTO_SKIN.toLowerCase()) return "";
  const [r, g, b] = rgb(skin), [pr, pg, pb] = rgb(PHOTO_SKIN);
  const k = [r / pr, g / pg, b / pb].map((v) => v.toFixed(3));
  return `
    <filter id="tone-${id}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
      <feColorMatrix type="matrix" values="${k[0]} 0 0 0 0  0 ${k[1]} 0 0 0  0 0 ${k[2]} 0 0  0 0 0 1 0"/>
    </filter>
    <mask id="sk-${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="520" height="380">
      <image href="${HAND_SKIN_MASK}" x="0" y="0" width="520" height="380" preserveAspectRatio="xMidYMid slice"/>
    </mask>`;
}

let uidCounter = 0;
/** Gera o SVG (conteúdo interno, viewBox 0 0 520 380) da mão com o design aplicado. */
function handMarkup(d, { animate = false } = {}) {
  const id = "n" + ++uidCounter;
  const shape = SHAPES[d.shape] || SHAPES.amendoada;
  const skin = d.skin || PHOTO_SKIN;
  const edge = shade(d.color, -0.25);
  const heartColor = luminance(d.color) > 0.72 ? "#E8588A" : "#FFFFFF";
  const nude = "#F4D6CF";
  const toneFilter = skinToneFilter(id, skin);

  const defs = `
    <defs>
      ${toneFilter}
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
      <!-- curvatura da unha: laterais mais escuras -->
      <linearGradient id="nc-${id}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".22" stop-color="#000" stop-opacity="0"/>
        <stop offset=".72" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".34"/>
      </linearGradient>
      <!-- sombra junto à cutícula -->
      <linearGradient id="cu-${id}" x1="0" y1="129" x2="0" y2="95" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#3a1f15" stop-opacity=".28"/><stop offset="1" stop-color="#3a1f15" stop-opacity="0"/>
      </linearGradient>
      <filter id="ns-${id}" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation=".35" result="soft"/>
        <feDropShadow in="soft" dx="0" dy="1" stdDeviation="1.2" flood-color="#3a1f15" flood-opacity=".3"/>
      </filter>
      <filter id="nb-${id}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.2"/></filter>
    </defs>`;

  const photoImg = (attrs = "") => `<image href="${HAND_PHOTO}" x="0" y="0" width="520" height="380" preserveAspectRatio="xMidYMid slice"${attrs}/>`;
  const photo = photoImg() + (toneFilter ? `<g mask="url(#sk-${id})">${photoImg(` filter="url(#tone-${id})"`)}</g>` : "");

  const nails = NAILS.map((f, i) => {
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
    layers += `<rect x="-31" y="-60" width="62" height="200" fill="url(#nc-${id})"/><rect x="-31" y="90" width="62" height="45" fill="url(#cu-${id})"/>`;
    if (d.finish === "fosco") layers += `<rect x="-40" y="-60" width="80" height="200" fill="#fff" opacity=".08"/>`;
    else layers += `<path d="M-15,108 C-19,84 -18,58 -11,36" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity="${d.finish === "cromado" ? 0.85 : 0.6}"/>
                    <path d="M14,98 C16,86 16,74 13,62" stroke="#fff" stroke-width="2.5" stroke-linecap="round" fill="none" opacity=".28"/>
                    <circle cx="-6" cy="28" r="2.6" fill="#fff" opacity=".6"/>`;
    if (isAccent) layers += `<path d="${HEART}" fill="${heartColor}" transform="translate(0,-4)"/>`;

    // luz e sombra da própria foto por cima da cor (a unha herda o volume real)
    // (só na zona da unha natural — o formato "curtinha" — e nunca na parte alongada)
    const strength = d.finish === "fosco" ? 0.45 : luminance(d.color) < 0.25 ? 0.5 : 0.8;
    const texture = `
      <clipPath id="w-${id}-${i}" clipPathUnits="userSpaceOnUse"><path d="${shape.d}" transform="${f.t}"/></clipPath>
      <clipPath id="r-${id}-${i}" clipPathUnits="userSpaceOnUse"><path d="${SHAPES.curta.d}" transform="${f.t}"/></clipPath>
      <g clip-path="url(#w-${id}-${i})" style="mix-blend-mode:soft-light" opacity="${strength}"><g clip-path="url(#r-${id}-${i})">
        <image href="${HAND_PHOTO}" x="0" y="0" width="520" height="380" preserveAspectRatio="xMidYMid slice"/>
      </g></g>`;

    return `
      <g class="nail" ${animate ? `style="animation:nailFade .5s ${i * 0.05}s backwards"` : ""}>
        <g transform="${f.t}" filter="url(#${f.blur ? "nb" : "ns"}-${id})">
          <path d="${shape.d}" fill="${baseFill}" stroke="${d.finish === "francesinha" ? shade(nude, -0.15) : edge}" stroke-width=".8" vector-effect="non-scaling-stroke"/>
          <g clip-path="url(#c-${id})">${layers}</g>
        </g>
        ${f.blur ? "" : texture}
      </g>`;
  }).join("");

  return defs + `<g style="isolation:isolate">${photo}${nails}</g>`;
}

