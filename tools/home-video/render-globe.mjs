import { createRequire } from "node:module"; const { chromium } = createRequire(import.meta.url)("playwright");
import { mkdirSync, writeFileSync } from "node:fs"; import { execFileSync } from "node:child_process";
const [,, mode, variant="center"] = process.argv; const FPS=24,T=40;
const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1280,height:720}});
await p.goto("file://"+process.cwd()+"/scene.html");
if(mode==="still"){ const u=await p.evaluate(([t,v])=>window.renderFrame(t,v),[6,variant]); writeFileSync(`still-${variant}.png`,Buffer.from(u.split(",")[1],"base64")); }
else { const d=`frames-${variant}`; mkdirSync(d,{recursive:true});
  for(let i=0;i<FPS*T;i++){ const u=await p.evaluate(([t,v])=>window.renderFrame(t,v),[i/FPS,variant]); writeFileSync(`${d}/f${String(i).padStart(4,"0")}.png`,Buffer.from(u.split(",")[1],"base64")); if(i%120===0)console.log("frame",i); }
  execFileSync("ffmpeg",["-y","-loglevel","error","-framerate",String(FPS),"-i",`${d}/f%04d.png`,"-c:v","libx264","-preset","slow","-crf","26","-pix_fmt","yuv420p","-movflags","+faststart","-an",`globe-${variant}.mp4`]);
  execFileSync("ffmpeg",["-y","-loglevel","error","-i",`${d}/f0000.png`,"-q:v","4",`globe-${variant}.jpg`]);}
await b.close();
