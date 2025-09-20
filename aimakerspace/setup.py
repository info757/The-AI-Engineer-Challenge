from setuptools import setup, find_packages

setup(
    name="aimakerspace",
    version="0.1.0",
    description="AI Maker Space utilities for text processing and vector operations",
    packages=find_packages(),
    install_requires=[
        "numpy>=1.24.0",
        "openai>=1.0.0",
        "PyPDF2>=3.0.0",
        "python-dotenv>=1.0.0",
    ],
    python_requires=">=3.8",
)
