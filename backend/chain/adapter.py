"""
ChainBreak-Web3 — Execution Adapter Interface

Defines the protocol for onchain and local simulated EVM execution substrates.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable
from backend.core.models import TransactionProposal


@runtime_checkable
class ExecutionAdapter(Protocol):
    """
    Unified interface for signing and broadcasting transaction proposals.
    """
    def sign_and_broadcast(self, proposal: TransactionProposal) -> str:
        """
        Signs the transaction with the wallet key and broadcasts it to the EVM network.
        Returns the transaction hash string.
        """
        ...
