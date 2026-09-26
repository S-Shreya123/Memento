/**
 * Built-in demo songs for Memento's activity music.
 *
 * The database stores lightweight markers ("demo:calm"); the actual audio is
 * synthesized in the browser as a WAV data URL and cached for the session.
 * Families replace these with real uploads or Spotify links at any time.
 */

const MELODIES: Record<string, Array<[number, number]>> = {
  calm: [
    [523.25, 0.6], [659.25, 0.6], [783.99, 0.9],
    [659.25, 0.6], [523.25, 0.9],
  ],
  evening: [
    [440.0, 0.6], [523.25, 0.6], [659.25, 0.9],
    [587.33, 0.6], [440.0, 0.9],
  ],
  strings: [
    [392.0, 0.8], [493.88, 0.8], [587.33, 1.0],
    [493.88, 0.8], [392.0, 1.0],
  ],
};

const cache: Record<string, string> = {};

export function demoToneUrl(name: string): string {
  if (cache[name]) return cache[name];
  const notes = MELODIES[name] ?? MELODIES.calm;
  const sr = 22050;
  const totalSamples = Math.ceil(notes.reduce((s, n) => s + n[1], 0) * sr);
  const data = new Float32Array(totalSamples);
  let ix = 0;
  for (const [freq, dur] of notes) {
    const n = Math.floor(dur * sr);
    for (let i = 0; i < n && ix < totalSamples; i++, ix++) {
      const t = i / sr;
      const fade = Math.min(1, i / (0.02 * sr), (n - i) / (0.05 * sr));
      data[ix] =
        0.22 * fade * (Math.sin(2 * Math.PI * freq * t) + 0.35 * Math.sin(4 * Math.PI * freq * t));
    }
  }

  // Encode as 16-bit mono WAV.
  const buf = new ArrayBuffer(44 + totalSamples * 2);
  const view = new DataView(buf);
  const w = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  w(0, "RIFF");
  view.setUint32(4, 36 + totalSamples * 2, true);
  w(8, "WAVE");
  w(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sr, true);
  view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  w(36, "data");
  view.setUint32(40, totalSamples * 2, true);
  for (let i = 0; i < totalSamples; i++) {
    const s = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(44 + i * 2, s * 0x7fff, true);
  }

  const bytes = new Uint8Array(buf);
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + CHUNK)) as unknown as number[],
    );
  }
  const url = `data:audio/wav;base64,${btoa(bin)}`;
  cache[name] = url;
  return url;
}

/** Demo track definitions seeded once per workspace (dataUrl holds a marker). */
export const DEMO_MUSIC_TRACKS = [
  { title: "Gentle piano — quiet morning", dataUrl: "demo:calm" },
  { title: "Gentle piano — soft evening", dataUrl: "demo:evening" },
  { title: "Warm strings — remembered melodies", dataUrl: "demo:strings" },
];
