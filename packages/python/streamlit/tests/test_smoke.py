"""Smoke tests for askable-streamlit.

These tests require streamlit to be installed (as it is in CI after
`pip install -e packages/python/streamlit/`).  If streamlit is absent the
tests are skipped automatically.
"""

import importlib.util
import pathlib

import pytest

streamlit = pytest.importorskip("streamlit", reason="streamlit not installed — skipping")

_PKG_INIT = pathlib.Path(__file__).parent.parent / "__init__.py"


def _load_module():
    """Load packages/python/streamlit/__init__.py via importlib.

    The module must be registered in sys.modules before exec so that
    streamlit's declare_component() can resolve the caller module name via
    inspect.getmodule().
    """
    _name = "_askable_streamlit_test"
    import sys as _sys
    if _name in _sys.modules:
        return _sys.modules[_name]
    spec = importlib.util.spec_from_file_location(_name, _PKG_INIT)
    mod = importlib.util.module_from_spec(spec)
    _sys.modules[_name] = mod
    spec.loader.exec_module(mod)
    return mod


def test_module_loads_without_error():
    """The package must be importable with streamlit installed."""
    mod = _load_module()
    assert mod is not None


def test_askable_context_is_callable():
    mod = _load_module()
    assert callable(mod.askable_context)


def test_askable_context_default_returns_none():
    """Outside a Streamlit runtime the component returns its default (None)."""
    mod = _load_module()
    result = mod.askable_context()
    assert result is None
