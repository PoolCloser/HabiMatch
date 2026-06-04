"""Compatibility import for the shared backend auth dependency."""

import sys

from backend.models import auth as _auth

sys.modules[__name__] = _auth
