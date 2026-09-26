"""
Unit Tests for Phase 5: Agent Simulator & Attack Mutators (ATTACK-01 to ATTACK-04)
"""

import pytest
from backend.core.models import Decision
from backend.eval.scenarios import (
    SCENARIOS_CORPUS,
    create_legitimate_eth_proposal,
    create_legitimate_erc20_proposal,
    mutate_recipient,
    mutate_amount,
    mutate_contract,
    mutate_chain,
    mutate_method,
    mutate_nonce,
    create_trajectory_attack,
    get_all_scenarios,
    get_scenario_by_id,
)
from backend.chain.decoder import decode_evm_transaction
from backend.chain.fixtures import (
    CHAIN_ID_SEPOLIA,
    SEPOLIA_USDC_CONTRACT,
    ALICE_ADDRESS,
    BOB_ADDRESS,
    MALLORY_ADDRESS,
)


def test_attack01_legitimate_proposal_generators():
    """Verify ATTACK-01: Generates valid EVM proposals matching intent."""
    eth_prop = create_legitimate_eth_proposal(
        recipient=ALICE_ADDRESS,
        amount_wei=10**18,
        chain_id=CHAIN_ID_SEPOLIA,
        nonce=1,
    )
    assert eth_prop.to == ALICE_ADDRESS
    assert eth_prop.value == 10**18
    assert eth_prop.data == ""

    decoded_eth = decode_evm_transaction(eth_prop).decoded
    assert decoded_eth.asset == "ETH"
    assert decoded_eth.recipient == ALICE_ADDRESS.lower()
    assert decoded_eth.amount == 10**18

    erc20_prop = create_legitimate_erc20_proposal(
        token_contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
        chain_id=CHAIN_ID_SEPOLIA,
        nonce=2,
    )
    assert erc20_prop.to == SEPOLIA_USDC_CONTRACT
    assert erc20_prop.value == 0
    assert erc20_prop.data.startswith("0xa9059cbb")

    decoded_erc20 = decode_evm_transaction(erc20_prop).decoded
    assert decoded_erc20.asset == "USDC"
    assert decoded_erc20.recipient == ALICE_ADDRESS.lower()
    assert decoded_erc20.amount == 50_000_000


def test_attack02_recipient_mutation():
    """Verify ATTACK-02: Recipient mutator cleanly updates recipient address."""
    legit = create_legitimate_erc20_proposal(
        token_contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
    )
    mutated = mutate_recipient(legit, MALLORY_ADDRESS)
    
    decoded = decode_evm_transaction(mutated).decoded
    assert decoded.recipient == MALLORY_ADDRESS.lower()
    assert decoded.amount == 50_000_000  # Amount preserved


def test_attack02_amount_mutation():
    """Verify ATTACK-02: Amount mutator cleanly inflates transfer value."""
    legit = create_legitimate_erc20_proposal(
        token_contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
    )
    mutated = mutate_amount(legit, 500_000_000)

    decoded = decode_evm_transaction(mutated).decoded
    assert decoded.recipient == ALICE_ADDRESS.lower()  # Recipient preserved
    assert decoded.amount == 500_000_000


def test_attack02_contract_and_chain_mutation():
    """Verify ATTACK-02: Contract and chain mutators."""
    legit = create_legitimate_erc20_proposal(
        token_contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
    )
    mutated_contract = mutate_contract(legit, "0x0000000000000000000000000000000000001234")
    assert mutated_contract.to == "0x0000000000000000000000000000000000001234"

    mutated_chain = mutate_chain(legit, 1)
    assert mutated_chain.chain_id == 1


def test_attack03_multi_step_trajectory_attack():
    """Verify ATTACK-03: Multi-step trajectory sequence construction."""
    from backend.eval.scenarios import _base_usdc_intent
    intent = _base_usdc_intent("intent_test", "Budget test")
    
    proposals = create_trajectory_attack(intent, [40_000_000, 50_000_000, 30_000_000])
    assert len(proposals) == 3
    assert proposals[0].nonce == 0
    assert proposals[1].nonce == 1
    assert proposals[2].nonce == 2

    # Check decoded amounts
    d0 = decode_evm_transaction(proposals[0]).decoded
    d1 = decode_evm_transaction(proposals[1]).decoded
    d2 = decode_evm_transaction(proposals[2]).decoded
    assert d0.amount == 40_000_000
    assert d1.amount == 50_000_000
    assert d2.amount == 30_000_000
    assert (d0.amount + d1.amount + d2.amount) == 120_000_000  # Exceeds 100 max_session


def test_attack04_unauthorized_method_mutation():
    """Verify ATTACK-04: Method mutator swaps transfer selector for approve selector."""
    legit = create_legitimate_erc20_proposal(
        token_contract=SEPOLIA_USDC_CONTRACT,
        recipient=ALICE_ADDRESS,
        amount=50_000_000,
    )
    # approve selector: 095ea7b3
    mutated = mutate_method(legit, "095ea7b3")
    assert mutated.data.startswith("0x095ea7b3")


def test_w1_through_w15_corpus_integrity():
    """Verify all 15 brutal scenarios (W01–W15) exist and validate."""
    scenarios = get_all_scenarios()
    assert len(scenarios) == 15

    expected_ids = [f"W{i:02d}" for i in range(1, 16)]
    for sid in expected_ids:
        sc = get_scenario_by_id(sid)
        assert sc is not None
        assert sc.id == sid
        assert len(sc.proposals) >= 1
        assert sc.intent is not None

    # Verify backward compatibility lookup by short ID (e.g. W1 for W01)
    assert get_scenario_by_id("W1") is not None
    assert get_scenario_by_id("W1").id == "W01"

