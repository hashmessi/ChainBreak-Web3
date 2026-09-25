"""
ChainBreak-Web3 Chain Layer
Deterministic calldata decoding, EVM adapters, and fixtures.
"""

from .decoder import (
    DecodeResult,
    decode_evm_transaction,
    encode_erc20_transfer,
    to_checksum_address,
)
from .fixtures import (
    CHAIN_ID_SEPOLIA,
    SEPOLIA_USDC_CONTRACT,
    ALICE_ADDRESS,
    BOB_ADDRESS,
    MALLORY_ADDRESS,
    STANDARD_TOKEN_MAP,
)

__all__ = [
    "DecodeResult",
    "decode_evm_transaction",
    "encode_erc20_transfer",
    "to_checksum_address",
    "CHAIN_ID_SEPOLIA",
    "SEPOLIA_USDC_CONTRACT",
    "ALICE_ADDRESS",
    "BOB_ADDRESS",
    "MALLORY_ADDRESS",
    "STANDARD_TOKEN_MAP",
]
