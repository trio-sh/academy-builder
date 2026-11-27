import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoContains } from "d3-geo";
const topo = JSON.parse(readFileSync("node_modules/world-atlas/land-110m.json", "utf8"));
const land = feature(topo, topo.objects.land);
const W = 360, H = 180, bits = new Uint8Array(Math.ceil((W * H) / 8));
let n = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const lon = x - 180 + 0.5, lat = 90 - y - 0.5;
  if (geoContains(land, [lon, lat])) { bits[(y * W + x) >> 3] |= 1 << ((y * W + x) & 7); n++; }
}
console.log("land cells", n, "of", W * H);
writeFileSync("mask.b64", Buffer.from(bits).toString("base64"));
