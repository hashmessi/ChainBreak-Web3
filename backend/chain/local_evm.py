"""
ChainBreak-Web3 — Local Deterministic EVM Execution Adapter (CHAIN-01)

Simulates deterministic EVM state changes locally without external RPC or faucet dependencies.
Guarantees 100% reliable demo replay and testing offline.
"""

from __future__ import annotations

import hashlib
from typing import Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.core.models import TransactionProposal
from backend.chain.decoder import decode_evm_transaction
from backend.chain.fixtures import (
    ALICE_ADDRESS,
    BOB_ADDRESS,
    MALLORY_ADDRESS,
    OPERATOR_AGENT_ADDRESS,
    SEPOLIA_USDC_CONTRACT,
)


class LocalAccountState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    address: str
    nonce: int = 0
    eth_balance: int = 0
    token_balances: Dict[str, int] = Field(default_factory=dict)


class LocalExecutedTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    tx_hash: str
    proposal: TransactionProposal
    sender: str
    recipient: Optional[str]
    asset: str
    amount: int
    nonce: int


class LocalEVMAdapter:
    """
    In-memory deterministic EVM execution substrate.
    """

    def __init__(
        self,
        operator_address: str = OPERATOR_AGENT_ADDRESS,
        initial_eth_wei: int = 10 * 10**18,       # 10 ETH
        initial_usdc_units: int = 10_000 * 10**6,  # 10,000 USDC
    ):
        self.operator_address = operator_address.lower()
        self.accounts: Dict[str, LocalAccountState] = {
            self.operator_address: LocalAccountState(
                address=self.operator_address,
                eth_balance=initial_eth_wei,
                token_balances={"USDC": initial_usdc_units},
            ),
            ALICE_ADDRESS.lower(): LocalAccountState(
                address=ALICE_ADDRESS.lower(),
                eth_balance=0,
                token_balances={"USDC": 0},
            ),
            BOB_ADDRESS.lower(): LocalAccountState(
                address=BOB_ADDRESS.lower(),
                eth_balance=0,
                token_balances={"USDC": 0},
            ),
            MALLORY_ADDRESS.lower(): LocalAccountState(
                address=MALLORY_ADDRESS.lower(),
                eth_balance=0,
                token_balances={"USDC": 0},
            ),
        }
        self.transaction_history: List[LocalExecutedTransaction] = []

    def get_account(self, address: str) -> LocalAccountState:
        norm = address.lower()
        if norm not in self.accounts:
            self.accounts[norm] = LocalAccountState(address=norm)
        return self.accounts[norm]

    def get_balance(self, address: str, asset: str = "USDC") -> int:
        acct = self.get_account(address)
        if asset.upper() == "ETH":
            return acct.eth_balance
        return acct.token_balances.get(asset.upper(), 0)

    def sign_and_broadcast(self, proposal: TransactionProposal) -> str:
        """
        Executes simulated state change and returns deterministic transaction hash.
        """
        sender_acct = self.get_account(self.operator_address)
        nonce = proposal.nonce if proposal.nonce is not None else sender_acct.nonce

        # Compute deterministic transaction hash
        raw_seed = f"local_evm:{proposal.chain_id}:{self.operator_address}:{proposal.to}:{proposal.value}:{proposal.data}:{nonce}"
        tx_hash = f"0x{hashlib.sha256(raw_seed.encode('utf-8')).hexdigest()}"

        # Decode for local state transfer
        decode_res = decode_evm_transaction(proposal)
        asset = "ETH"
        amount = proposal.value
        recipient = proposal.to.lower()

        if decode_res.parseable and decode_res.decoded:
            decoded = decode_res.decoded
            asset = decoded.asset.upper()
            amount = decoded.amount if decoded.amount is not None else 0
            if decoded.recipient:
                recipient = decoded.recipient.lower()

        # Update local balances
        recipient_acct = self.get_account(recipient)
        if asset == "ETH":
            if sender_acct.eth_balance >= amount:
                sender_acct.eth_balance -= amount
                recipient_acct.eth_balance += amount
        else:
            current_sender_token = sender_acct.token_balances.get(asset, 0)
            if current_sender_token >= amount:
                sender_acct.token_balances[asset] = current_sender_token - amount
                recipient_acct.token_balances[asset] = recipient_acct.token_balances.get(asset, 0) + amount

        sender_acct.nonce += 1

        executed_tx = LocalExecutedTransaction(
            tx_hash=tx_hash,
            proposal=proposal,
            sender=self.operator_address,
            recipient=recipient,
            asset=asset,
            amount=amount,
            nonce=nonce,
        )
        self.transaction_history.append(executed_tx)
        return tx_hash
