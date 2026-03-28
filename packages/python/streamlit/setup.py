from setuptools import setup, find_packages

setup(
    name="askable-streamlit",
    version="0.1.0",
    description="LLM-aware UI focus context for Streamlit — askable Python binding",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="askable contributors",
    license="MIT",
    packages=find_packages(),
    include_package_data=True,
    package_data={"": ["frontend/*.html", "frontend/*.js", "frontend/*.css"]},
    python_requires=">=3.9",
    install_requires=[
        "streamlit>=1.28.0",
    ],
    keywords=["streamlit", "llm", "ai", "context", "ui"],
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Framework :: Streamlit",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
)
