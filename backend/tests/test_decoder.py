"""
Unit Tests for Phase 2: Deterministic EVM Calldata Decoder (DEC-01 to DEC-04)
"""

import pytest
from backend.core.models import TransactionProposal
from backend.chain.decoder import (
    DecodeResult,
    ERC20_TRANSFER_SELECTOR_HEX,
    decode_evm_transaction,
    encode_erc20_transfer,
    to_checksum_address,
)
from backend.chain.fixtures import (
    CHAIN_ID_SEPOLIA,
    SEPOLIA_USDC_CONTRACT,
    ALICE_ADDRESS,
    BOB_ADDRESS,
    MALLORY_ADDRESS,
)


def test_native_eth_transfer_decoding():
    """Verify DEC-01: Native ETH transfer (empty calldata) decodes cleanly."""
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=ALICE_ADDRESS,
        value=1_500_000_000_000_000_000,  # 1.5 ETH in wei
        data="",
        nonce=1,
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is True
    assert result.hold_reason is None
    assert result.decoded is not None
    assert result.decoded.asset == "ETH"
    assert result.decoded.method == "transfer"
    assert result.decoded.contract == "NATIVE"
    assert result.decoded.recipient == ALICE_ADDRESS.lower()
    assert result.decoded.amount == 1_500_000_000_000_000_000
    assert result.decoded.raw_value == 1_500_000_000_000_000_000


def test_native_eth_transfer_with_0x_empty_data():
    """Verify DEC-01: Native ETH transfer with '0x' calldata."""
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=BOB_ADDRESS,
        value=500_000_000_000_000_000,
        data="0x",
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is True
    assert result.decoded.asset == "ETH"
    assert result.decoded.recipient == BOB_ADDRESS.lower()
    assert result.decoded.amount == 500_000_000_000_000_000


def test_erc20_transfer_decoding():
    """Verify DEC-02: Standard ERC-20 transfer calldata decodes accurately."""
    # 50 USDC = 50_000_000 base units (6 decimals)
    amount = 50_000_000
    calldata = encode_erc20_transfer(ALICE_ADDRESS, amount)
    assert calldata.startswith("0xa9059cbb")
    assert len(calldata) == 2 + 8 + 64 + 64  # '0x' + 4 bytes selector + 32 bytes addr + 32 bytes amount = 138 chars

    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=calldata,
        nonce=10,
    )

    result = decode_evm_transaction(proposal)
    assert result.parseable is True
    assert result.hold_reason is None
    assert result.decoded is not None
    assert result.decoded.asset == "USDC"
    assert result.decoded.method == "transfer"
    assert result.decoded.contract == SEPOLIA_USDC_CONTRACT.lower()
    assert result.decoded.recipient == ALICE_ADDRESS.lower()
    assert result.decoded.amount == 50_000_000
    assert result.decoded.raw_to == SEPOLIA_USDC_CONTRACT.lower()


def test_erc20_transfer_max_uint256():
    """Verify DEC-02: Handles large uint256 amounts without overflow."""
    max_uint256 = (1 << 256) - 1
    calldata = encode_erc20_transfer(BOB_ADDRESS, max_uint256)

    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=calldata,
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is True
    assert result.decoded.amount == max_uint256


def test_fail_closed_truncated_selector():
    """Verify DEC-03: Truncated calldata returns typed hold_reason."""
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=ALICE_ADDRESS,
        value=0,
        data="0xa905",  # Only 2 bytes
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is False
    assert result.decoded is None
    assert "TRUNCATED_CALLDATA_SELECTOR" in result.hold_reason


def test_fail_closed_truncated_erc20_calldata():
    """Verify DEC-03: Calldata with ERC-20 selector but truncated arguments fails closed."""
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data="0xa9059cbb00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8",  # Missing amount word
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is False
    assert result.decoded is None
    assert "TRUNCATED_ERC20_CALLDATA_LENGTH" in result.hold_reason


def test_fail_closed_unknown_selector():
    """Verify DEC-03: Unrecognized 4-byte selector safely fails closed."""
    # approve(address,uint256) selector is 0x095ea7b3
    calldata = "0x095ea7b300000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c80000000000000000000000000000000000000000000000000000000002faf080"
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=calldata,
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is False
    assert result.decoded is None
    assert "UNKNOWN_SELECTOR:0x095ea7b3" in result.hold_reason


def test_fail_closed_malformed_hex_odd_length():
    """Verify DEC-03: Malformed odd-length hex strings fail closed."""
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=ALICE_ADDRESS,
        value=0,
        data="0xa9059cbb1",
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is False
    assert result.hold_reason == "MALFORMED_HEX_ODD_LENGTH"


def test_fail_closed_malformed_hex_non_hex_characters():
    """Verify DEC-03: Non-hex characters fail closed."""
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=ALICE_ADDRESS,
        value=0,
        data="0xZZZZ9cbb",
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is False
    assert "MALFORMED_HEX_CHARACTERS" in result.hold_reason


def test_fail_closed_invalid_to_address():
    """Verify DEC-03: Invalid target EVM address fails closed."""
    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to="invalid_address_format",
        value=100,
        data="",
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is False
    assert "INVALID_TARGET_ADDRESS" in result.hold_reason


def test_anomalous_address_padding():
    """Verify DEC-03: Non-zero padding in high 12 bytes of address word fails closed."""
    # 0xa9059cbb + 0xffffffff... (dirty high bytes) + recipient + amount
    dirty_word = "ffffffffffffffffffffffff" + ALICE_ADDRESS[2:].lower()
    amount_word = "0" * 64
    calldata = f"0x{ERC20_TRANSFER_SELECTOR_HEX}{dirty_word}{amount_word}"

    proposal = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=calldata,
    )
    result = decode_evm_transaction(proposal)
    assert result.parseable is False
    assert "ANOMALOUS_ERC20_ADDRESS_PADDING" in result.hold_reason
