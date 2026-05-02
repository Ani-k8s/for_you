from __future__ import annotations

import threading
from typing import Optional

_state = threading.local()


def set_current_tenant(tenant) -> None:
    _state.tenant = tenant


def get_current_tenant() -> Optional[object]:
    return getattr(_state, "tenant", None)


def clear_current_tenant() -> None:
    if hasattr(_state, "tenant"):
        delattr(_state, "tenant")
