@echo off
rem One-time setup for speaker tracking: a private Python environment with OpenCV, and the YuNet face model.
rem Without it the app still works; clips are centre-cropped instead of following the speaker.
cd /d "%~dp0.."
set "PY="
where python >nul 2>nul && set "PY=python"
if not defined PY ( where py >nul 2>nul && set "PY=py -3" )
if not defined PY ( echo Python was not found. & exit /b 1 )
%PY% -m venv .venv || exit /b 1
.venv\Scripts\python.exe -m pip install --quiet --upgrade pip
.venv\Scripts\python.exe -m pip install --quiet opencv-python-headless numpy || exit /b 1
if not exist "tools\face_detection_yunet_2023mar.onnx" (
  curl -fsSL -o "tools\face_detection_yunet_2023mar.onnx" https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx || exit /b 1
)
.venv\Scripts\python.exe -c "import cv2; print('OpenCV', cv2.__version__, 'ready')"
