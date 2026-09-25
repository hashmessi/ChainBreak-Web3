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
    CHAIN_ID_BASE_SEPOLIA,
    CHAIN_ID_ETHEREUM_MAINNET,
    CHAIN_ID_LOCAL,
    SEPOLIA_USDC_CONTRACT,
    SEPOLIA_WETH_CONTRACT,
    ALICE_ADDRESS,
    BOB_ADDRESS,
    MALLORY_ADDRESS,
    OPERATOR_AGENT_ADDRESS,
    STANDARD_TOKEN_MAP,
)
from .adapter import ExecutionAdapter
from .local_evm import LocalEVMAdapter, LocalAccountState, LocalExecutedTransaction
from .testnet import TestnetEVMAdapter, get_explorer_url

__all__ = [
    "DecodeResult",
    "decode_evm_transaction",
    "encode_erc20_transfer",
    "to_checksum_address",
    "CHAIN_ID_SEPOLIA",
    "CHAIN_ID_BASE_SEPOLIA",
    "CHAIN_ID_ETHEREUM_MAINNET",
    "CHAIN_ID_LOCAL",
    "SEPOLIA_USDC_CONTRACT",
    "SEPOLIA_WETH_CONTRACT",
    "ALICE_ADDRESS",
    "BOB_ADDRESS",
    "MALLORY_ADDRESS",
    "OPERATOR_AGENT_ADDRESS",
    "STANDARD_TOKEN_MAP",
    "ExecutionAdapter",
    "LocalEVMAdapter",
    "LocalAccountState",
    "LocalExecutedTransaction",
    "TestnetEVMAdapter",
    "get_explorer_url",
]
