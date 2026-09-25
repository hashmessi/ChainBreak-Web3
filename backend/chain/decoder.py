"""
ChainBreak-Web3 — Deterministic EVM Calldata Decoder

Implements a 100% pure-Python, zero-LLM, zero-network deterministic calldata decoder.
Supports:
1. Native ETH transfers (DEC-01)
2. Standard ERC-20 transfer(address,uint256) (DEC-02)
3. Fail-closed error handling emitting DecodeResult with hold_reason (DEC-03)
4. Pure Python execution (DEC-04)
"""

from __future__ import annotations

import hashlib
import re
from typing import Dict, Optional
from pydantic import BaseModel, ConfigDict, Field

from backend.core.models import DecodedEvmTransaction, TransactionProposal, canonical_hash
from backend.chain.fixtures import STANDARD_TOKEN_MAP


# ERC-20 transfer(address,uint256) method selector: keccak256("transfer(address,uint256)")[:4]
ERC20_TRANSFER_SELECTOR_BYTES = bytes.fromhex("a9059cbb")
ERC20_TRANSFER_SELECTOR_HEX = "a9059cbb"

HEX_ADDRESS_PATTERN = re.compile(r"^0x[0-9a-fA-F]{40}$")


def to_checksum_address(address: str) -> str:
    """
    Normalizes an EVM address string to lowercase or standardized format with 0x prefix.
    Validates 20-byte address structure.
    """
    clean = address.strip()
    if clean.startswith("0x") or clean.startswith("0X"):
        clean = clean[2:]
    if len(clean) != 40:
        raise ValueError(f"Invalid EVM address length ({len(clean)} chars): 0x{clean}")
    # Verify valid hex
    int(clean, 16)
    return f"0x{clean.lower()}"


def encode_erc20_transfer(recipient: str, amount: int) -> str:
    """
    Helper utility to encode an ERC-20 transfer(address,uint256) calldata string.
    """
    clean_addr = recipient.strip()
    if clean_addr.startswith("0x") or clean_addr.startswith("0X"):
        clean_addr = clean_addr[2:]
    if len(clean_addr) != 40:
        raise ValueError(f"Invalid recipient address length: {recipient}")
    
    # 4 bytes selector + 32 bytes address (12 zero bytes + 20 address bytes) + 32 bytes amount
    padded_addr = clean_addr.lower().rjust(64, "0")
    padded_amount = hex(amount)[2:].rjust(64, "0")
    return f"0x{ERC20_TRANSFER_SELECTOR_HEX}{padded_addr}{padded_amount}"


class DecodeResult(BaseModel):
    """
    Result of deterministic calldata decoding.
    If parseable is False, hold_reason contains the specific failure code.
    """
    model_config = ConfigDict(extra="ignore")

    parseable: bool
    decoded: Optional[DecodedEvmTransaction] = None
    hold_reason: Optional[str] = None


def decode_evm_transaction(
    proposal: TransactionProposal,
    token_symbol_map: Optional[Dict[str, str]] = None,
) -> DecodeResult:
    """
    Deterministically decodes raw EVM calldata and transaction parameters.
    Never raises an exception — all parsing failures return DecodeResult(parseable=False, hold_reason=...).
    """
    try:
        # Validate target address
        raw_to = proposal.to.strip() if proposal.to else ""
        if not HEX_ADDRESS_PATTERN.match(raw_to):
            return DecodeResult(
                parseable=False,
                hold_reason=f"INVALID_TARGET_ADDRESS: {raw_to}",
            )
        normalized_to = to_checksum_address(raw_to)

        # Parse calldata hex
        raw_data = proposal.data.strip() if proposal.data else ""
        if raw_data.startswith("0x") or raw_data.startswith("0X"):
            raw_data = raw_data[2:]

        # Check for malformed hex characters
        if len(raw_data) % 2 != 0:
            return DecodeResult(
                parseable=False,
                hold_reason="MALFORMED_HEX_ODD_LENGTH",
            )

        try:
            calldata_bytes = bytes.fromhex(raw_data) if raw_data else b""
        except ValueError as e:
            return DecodeResult(
                parseable=False,
                hold_reason=f"MALFORMED_HEX_CHARACTERS: {str(e)}",
            )

        calldata_hash = hashlib.sha256(calldata_bytes).hexdigest()

        # ─── DEC-01: Native ETH Transfer (empty calldata) ────────────────────
        if len(calldata_bytes) == 0:
            decoded = DecodedEvmTransaction(
                chain_id=proposal.chain_id,
                asset="ETH",
                method="transfer",
                contract="NATIVE",
                recipient=normalized_to,
                amount=proposal.value,
                raw_to=normalized_to,
                raw_value=proposal.value,
                calldata_hash=calldata_hash,
            )
            return DecodeResult(parseable=True, decoded=decoded)

        # ─── DEC-02: ERC-20 transfer(address,uint256) ────────────────────────
        if len(calldata_bytes) < 4:
            return DecodeResult(
                parseable=False,
                hold_reason="TRUNCATED_CALLDATA_SELECTOR",
            )

        selector = calldata_bytes[:4]
        if selector == ERC20_TRANSFER_SELECTOR_BYTES:
            if len(calldata_bytes) < 68:
                return DecodeResult(
                    parseable=False,
                    hold_reason=f"TRUNCATED_ERC20_CALLDATA_LENGTH: expected 68 bytes, got {len(calldata_bytes)}",
                )

            # Decode 32-byte recipient word (right-aligned 20 bytes)
            recipient_word = calldata_bytes[4:36]
            # Check padding: high 12 bytes must be 0x00 in canonical EVM encoding
            recipient_padding = recipient_word[:12]
            if recipient_padding != b"\x00" * 12:
                # Non-zero padding in high bytes is an anomaly -> hold for safety
                return DecodeResult(
                    parseable=False,
                    hold_reason="ANOMALOUS_ERC20_ADDRESS_PADDING",
                )

            recipient_bytes = recipient_word[12:36]
            recipient_address = f"0x{recipient_bytes.hex().lower()}"

            # Decode 32-byte uint256 amount word
            amount_word = calldata_bytes[36:68]
            amount = int.from_bytes(amount_word, byteorder="big", signed=False)

            # Lookup asset symbol from token contract
            active_token_map = dict(STANDARD_TOKEN_MAP)
            if token_symbol_map:
                active_token_map.update({k.lower(): v for k, v in token_symbol_map.items()})

            contract_lower = normalized_to.lower()
            asset_symbol = active_token_map.get(contract_lower, "USDC" if "usdc" in contract_lower else "ERC20")

            decoded = DecodedEvmTransaction(
                chain_id=proposal.chain_id,
                asset=asset_symbol,
                method="transfer",
                contract=normalized_to,
                recipient=recipient_address,
                amount=amount,
                raw_to=normalized_to,
                raw_value=proposal.value,
                calldata_hash=calldata_hash,
            )
            return DecodeResult(parseable=True, decoded=decoded)

        # ─── DEC-03: Unrecognized 4-byte Selector ────────────────────────────
        unknown_selector_hex = f"0x{selector.hex()}"
        return DecodeResult(
            parseable=False,
            hold_reason=f"UNKNOWN_SELECTOR:{unknown_selector_hex}",
        )

    except Exception as exc:
        # Fail-closed safety shield: Never crash caller
        return DecodeResult(
            parseable=False,
            hold_reason=f"DECODER_EXCEPTION: {type(exc).__name__}: {str(exc)}",
        )
