from setuptools import setup, find_packages

setup(
    name="comfort-routing",
    version="1.0.0",
    python_requires=">=3.12,<3.13",
    install_requires=[
        "fastapi",
        "uvicorn[standard]",
        "networkx",
        "numpy",
        "requests",
        "pydantic",
        "pyproj",
        "shapely",
        "scipy",
        "Pillow",
        "rasterio",
        "matplotlib",
    ],
    packages=find_packages(),
)
