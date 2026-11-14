"""Face positions for speaker tracking. Called by server/real-adapter.mjs.

usage: track.py FFMPEG SOURCE START DURATION WIDTH HEIGHT FPS MODEL
Prints {"frames": [[[cx, cy, w, h, score], ...], ...]} with every value in 0..1 of the frame, one entry per
sampled frame. Uses OpenCV's YuNet detector when MODEL exists, otherwise the bundled Haar cascade.
"""
import json
import os
import subprocess
import sys

import cv2
import numpy as np

ff, src, start, dur, w, h, fps, model = sys.argv[1:9]
w, h = int(w), int(h)
proc = subprocess.Popen(
    [ff, "-hide_banner", "-loglevel", "error", "-ss", start, "-t", dur, "-i", src, "-an",
     "-vf", f"fps={fps},scale={w}:{h}", "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
    stdout=subprocess.PIPE)
yunet = cv2.FaceDetectorYN.create(model, "", (w, h), 0.6, 0.3, 50) if os.path.isfile(model) and hasattr(cv2, "FaceDetectorYN") else None
haar = None if yunet else cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
size, frames = w * h * 3, []
while True:
    buf = proc.stdout.read(size)
    if len(buf) < size:
        break
    img = np.frombuffer(buf, np.uint8).reshape(h, w, 3)
    if yunet:
        _, found = yunet.detect(img)
        rows = [] if found is None else [[(f[0] + f[2] / 2) / w, (f[1] + f[3] / 2) / h, f[2] / w, f[3] / h, float(f[-1])] for f in found]
    else:
        m = max(24, h // 12)
        rows = [[(x + fw / 2) / w, (y + fh / 2) / h, fw / w, fh / h, 0.9]
                for x, y, fw, fh in haar.detectMultiScale(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), 1.1, 5, minSize=(m, m))]
    frames.append([[round(float(v), 4) for v in r] for r in rows])
proc.wait()
print(json.dumps({"frames": frames}))
