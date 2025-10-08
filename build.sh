#!/bin/bash
set -e

echo "=== Upgrading pip ==="
python -m pip install --upgrade pip

echo "=== Installing build tools ==="
python -m pip install setuptools wheel

echo "=== Installing basic packages ==="
python -m pip install fastapi uvicorn

echo "=== Installing data processing packages ==="
python -m pip install networkx numpy requests

echo "=== Installing geospatial packages ==="
python -m pip install pyproj shapely

echo "=== Build completed successfully ==="
