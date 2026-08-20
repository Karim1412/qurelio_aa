"""In-process pub/sub for live agent-activity events, keyed by evaluation_id.

A single FastAPI worker process holds one EventBus singleton. Each evaluation
run publishes events while it executes, and one or more SSE subscribers can
read them concurrently. Events are buffered in per-subscriber asyncio.Queues
so a slow client never blocks the producer.

Multi-replica deployments would need Redis pub/sub here; out of scope for the
POC because evaluations run inside a single worker per process anyway.
"""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Buffer recent events per evaluation so a subscriber that connects right
# after the run started still sees the early phases (extract / first clauses).
_REPLAY_BUFFER = 200
_QUEUE_MAX = 500


class EventBus:
    def __init__(self) -> None:
        self._subs: Dict[str, List[asyncio.Queue]] = {}
        self._replay: Dict[str, List[dict]] = {}
        self._closed: Dict[str, float] = {}
        self._lock = asyncio.Lock()

    async def publish(self, evaluation_id: str, event_type: str, **fields: Any) -> None:
        ev = {
            "type": event_type,
            "evaluation_id": evaluation_id,
            "ts": time.time(),
            **fields,
        }
        async with self._lock:
            buf = self._replay.setdefault(evaluation_id, [])
            buf.append(ev)
            if len(buf) > _REPLAY_BUFFER:
                del buf[: len(buf) - _REPLAY_BUFFER]
            queues = list(self._subs.get(evaluation_id, []))
        for q in queues:
            try:
                q.put_nowait(ev)
            except asyncio.QueueFull:
                logger.warning("event_bus: dropping event for %s, subscriber slow", evaluation_id)

    async def close(self, evaluation_id: str) -> None:
        async with self._lock:
            self._closed[evaluation_id] = time.time()
            queues = list(self._subs.get(evaluation_id, []))
        for q in queues:
            try:
                q.put_nowait(None)
            except asyncio.QueueFull:
                pass

    async def subscribe(self, evaluation_id: str) -> "Subscription":
        q: asyncio.Queue = asyncio.Queue(maxsize=_QUEUE_MAX)
        async with self._lock:
            self._subs.setdefault(evaluation_id, []).append(q)
            replay = list(self._replay.get(evaluation_id, []))
            already_closed = evaluation_id in self._closed
        for ev in replay:
            try:
                q.put_nowait(ev)
            except asyncio.QueueFull:
                break
        if already_closed:
            try:
                q.put_nowait(None)
            except asyncio.QueueFull:
                pass
        return Subscription(self, evaluation_id, q)

    async def _unsubscribe(self, evaluation_id: str, q: asyncio.Queue) -> None:
        async with self._lock:
            lst = self._subs.get(evaluation_id)
            if lst and q in lst:
                lst.remove(q)
            if lst is not None and not lst:
                self._subs.pop(evaluation_id, None)

    async def cleanup_old(self, max_age_seconds: float = 1800.0) -> None:
        now = time.time()
        async with self._lock:
            stale = [k for k, t in self._closed.items() if now - t > max_age_seconds]
            for k in stale:
                self._replay.pop(k, None)
                self._closed.pop(k, None)


class Subscription:
    def __init__(self, bus: EventBus, evaluation_id: str, queue: asyncio.Queue):
        self._bus = bus
        self._evaluation_id = evaluation_id
        self._queue = queue

    async def get(self, timeout: Optional[float] = None) -> Optional[dict]:
        if timeout is None:
            return await self._queue.get()
        return await asyncio.wait_for(self._queue.get(), timeout=timeout)

    async def close(self) -> None:
        await self._bus._unsubscribe(self._evaluation_id, self._queue)


_bus: EventBus = EventBus()


def get_event_bus() -> EventBus:
    return _bus
