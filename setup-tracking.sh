#!/bin/sh
# One-time setup for speaker tracking: a private Python environment with OpenCV, and the YuNet face model.
# Without it the app still works; clips are centre-cropped instead of following the speaker.
set -e
cd "$(dirname "$0")/.."
python3 -m venv .venv
.venv/bin/pip install --quiet --upgrade pip
.venv/bin/pip install --quiet opencv-python-headless numpy
MODEL=tools/face_detection_yunet_2023mar.onnx
if [ ! -s "$MODEL" ]; then
  curl -fsSL -o "$MODEL" https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx
fi
.venv/bin/python -c "import cv2; print('OpenCV', cv2.__version__, 'ready')"
