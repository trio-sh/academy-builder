#!/bin/bash
# Turns an 8 second clip into a seamless 7 second loop: the last second cross-fades into the first, so the end meets the start with no jump.
# usage: make-loops.sh in.mp4 out.mp4
set -euo pipefail
ffmpeg -y -loglevel error -i "$1" -filter_complex "[0:v]scale=1280:720,fps=24,setsar=1,split=3[a][b][c];[a]trim=0:1,setpts=PTS-STARTPTS[head];[b]trim=1:7,setpts=PTS-STARTPTS[mid];[c]trim=7:8,setpts=PTS-STARTPTS[tail];[tail][head]xfade=transition=fade:duration=1:offset=0[blend];[blend][mid]concat=n=2:v=1:a=0[out]" -map "[out]" -c:v libx264 -preset slow -crf 29 -pix_fmt yuv420p -movflags +faststart -an "$2"
