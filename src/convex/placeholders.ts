/**
 * Deterministic SVG "photo" placeholders for demo data.
 * No personal data is fabricated beyond these clearly-stylised portraits:
 * they are stand-ins for photos the caregiver would upload.
 */

type PortraitSpec = {
  bg: string;
  skin: string;
  hair: string;
  garment: string;
  collar: string;
  glasses: boolean;
  beard: boolean;
  bindi: boolean;
  whiteHair: boolean;
};

const spec: Record<string, PortraitSpec> = {
  amiya: { bg: "#0F3B8C", skin: "#C68B59", hair: "#1A1A1A", garment: "#B4232A", collar: "#7A161B", glasses: false, beard: true, bindi: false, whiteHair: false },
  sarala: { bg: "#B4232A", skin: "#C98F63", hair: "#101010", garment: "#0F3B8C", collar: "#0A2A66", glasses: false, beard: false, bindi: true, whiteHair: false },
  debo: { bg: "#1A1A1A", skin: "#C08457", hair: "#0D0D0D", garment: "#2C5FBF", collar: "#1D4699", glasses: true, beard: false, bindi: false, whiteHair: false },
  ritu: { bg: "#B4232A", skin: "#CE9A6C", hair: "#20140C", garment: "#D6564B", collar: "#A6362E", glasses: false, beard: false, bindi: true, whiteHair: false },
  arun: { bg: "#0F3B8C", skin: "#C58A58", hair: "#141414", garment: "#16325C", collar: "#0E2240", glasses: false, beard: false, bindi: false, whiteHair: false },
  ipsha: { bg: "#2C5FBF", skin: "#D2A176", hair: "#0F0F0F", garment: "#E0B94F", collar: "#B79432", glasses: false, beard: false, bindi: true, whiteHair: false },
};

function portraitSvg(key: string): string {
  const s = spec[key] ?? spec.amiya;
  const initials: Record<string, string> = {
    amiya: "A",
    sarala: "S",
    debo: "D",
    ritu: "R",
    arun: "A",
    ipsha: "I",
  };
  const hair = s.whiteHair ? "#D8D8D8" : s.hair;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
  <rect width="600" height="600" fill="${s.bg}"/>
  <rect x="40" y="40" width="520" height="520" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="3"/>
  <circle cx="300" cy="238" r="98" fill="${s.skin}"/>
  <path d="M202 238 C202 150 260 118 300 118 C340 118 398 150 398 238 C398 200 380 178 300 178 C220 178 202 200 202 238 Z" fill="${hair}"/>
  ${s.glasses ? `<g fill="none" stroke="#101010" stroke-width="7"><circle cx="262" cy="242" r="26"/><circle cx="338" cy="242" r="26"/><line x1="288" y1="242" x2="312" y2="242"/></g>` : ""}
  ${s.beard ? `<path d="M232 268 C240 330 270 348 300 348 C330 348 360 330 368 268 C360 300 336 306 300 306 C264 306 240 300 232 268 Z" fill="#3A3A3A"/>` : ""}
  ${s.bindi ? `<circle cx="300" cy="176" r="9" fill="#8E1F26"/>` : ""}
  <circle cx="268" cy="238" r="6" fill="#1A1A1A"/>
  <circle cx="332" cy="238" r="6" fill="#1A1A1A"/>
  <path d="M278 292 Q300 306 322 292" fill="none" stroke="#7A3B22" stroke-width="6" stroke-linecap="round"/>
  <path d="M150 600 L150 470 C150 408 216 380 300 380 C384 380 450 408 450 470 L450 600 Z" fill="${s.garment}"/>
  <path d="M150 600 L150 470 C150 408 216 380 300 380 L300 600 Z" fill="rgba(255,255,255,0.08)"/>
  <path d="M262 380 L300 452 L338 380" fill="none" stroke="${s.collar}" stroke-width="14"/>
  <text x="300" y="565" font-family="Helvetica, Arial, sans-serif" font-size="44" font-weight="700" letter-spacing="10" fill="rgba(255,255,255,0.5)" text-anchor="middle">${initials[key] ?? "•"}</text>
</svg>`;
}

export function placeHolder(key: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(portraitSvg(key))}`;
}
