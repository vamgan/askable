from setuptools import setup, find_packages

setup(
    name="askable-django",
    version="0.1.0",
    description="LLM-aware UI context for Django — template tags + auto-inject middleware",
    long_description=open("README.md").read(),
    long_description_content_type="text/markdown",
    author="askable contributors",
    url="https://github.com/vamgan/askable",
    project_urls={
        "Homepage": "https://github.com/vamgan/askable",
        "Source": "https://github.com/vamgan/askable/tree/main/packages/python/django",
        "Bug Tracker": "https://github.com/vamgan/askable/issues",
    },
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "Django>=4.0",
    ],
    keywords=["django", "llm", "ai", "context", "ui", "templatetag"],
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Framework :: Django",
        "Framework :: Django :: 4.0",
        "Framework :: Django :: 4.2",
        "Framework :: Django :: 5.0",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Topic :: Scientific/Engineering :: Artificial Intelligence",
    ],
)
