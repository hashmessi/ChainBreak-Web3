"""
ChainBreak-Web3 — W16 Mutation-Fuzz Campaign

Adversarial mutation fuzzer taking an authorized base proposal (20 USDC → Alice)
and executing dozens of parameter and calldata mutations:
- Recipient mutation (attacker, zero address, burn, random)
- Amount mutation (overflow, > single limit, zero, max uint256)
- Contract mutation (unauthorized contracts, dead addresses)
- Chain ID mutation (Mainnet, Base, Arbitrum, random)
- Nonce mutation (replays, duplicate nonces)
- Method selector mutation (approve, permit, transferFrom, random 4 bytes)
- Calldata length & encoding mutation (truncated, odd hex, non-hex, bloated)

Enforces strict classification invariant:
SAFE → ALLOW
KNOWN BAD → BLOCK
UNPARSEABLE → HOLD
0 False Allows, 0 Unhandled Crashes.
"""

from __future__ import annotations

import random
from typing import List, Literal, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict, Field

from backend.core.models import (
    Decision,
    DecisionReceipt,
    IntentEnvelope,
    TrajectoryState,
    TransactionProposal,
)
from backend.core.executor import ChainBreakExecutor
from backend.chain.local_evm import LocalEVMAdapter
from backend.chain.decoder import encode_erc20_transfer
from backend.chain.fixtures import (
    CHAIN_ID_SEPOLIA,
    CHAIN_ID_BASE_SEPOLIA,
    CHAIN_ID_ETHEREUM_MAINNET,
    SEPOLIA_USDC_CONTRACT,
    SEPOLIA_WETH_CONTRACT,
    ALICE_ADDRESS,
    BOB_ADDRESS,
    MALLORY_ADDRESS,
)


class FuzzMutationResult(BaseModel):
    """Result of a single mutation run in W16 campaign."""
    model_config = ConfigDict(extra="ignore")

    mutation_index: int
    mutation_type: str
    description: str
    expected_classification: Literal["SAFE", "KNOWN_BAD", "UNPARSEABLE"]
    actual_decision: Decision
    passed: bool
    broadcast: bool
    reason: str


class FuzzCampaignReport(BaseModel):
    """Aggregated outcome of the W16 Mutation-Fuzz Campaign."""
    model_config = ConfigDict(extra="ignore")

    campaign_name: str = "W16 — Mutation-Fuzz Campaign"
    total_mutations: int
    safe_allowed: int = 0
    known_bad_blocked: int = 0
    unparseable_held: int = 0
    false_allows: int = 0
    unhandled_exceptions: int = 0
    all_invariants_held: bool = True
    summary: str = ""
    sample_results: List[FuzzMutationResult] = Field(default_factory=list)


def create_base_safe_proposal() -> TransactionProposal:
    """Canonical authorized proposal: 20 USDC → Alice on Sepolia."""
    return TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data=encode_erc20_transfer(ALICE_ADDRESS, 20_000_000),
        nonce=0,
        gas_limit=65000,
    )


def create_fuzz_intent() -> IntentEnvelope:
    """Strict authorized intent for fuzz testing."""
    return IntentEnvelope(
        intent_id="intent_fuzz_w16",
        user_goal="Execute approved payment of up to 50 USDC to Alice on Sepolia.",
        chain_id=CHAIN_ID_SEPOLIA,
        allowed_assets=["USDC"],
        allowed_recipients=[ALICE_ADDRESS],
        allowed_contracts=[SEPOLIA_USDC_CONTRACT],
        allowed_methods=["transfer"],
        max_single_value_per_asset={"USDC": 50_000_000},
        max_session_value_per_asset={"USDC": 100_000_000},
        expected_reason="invoice fuzz-w16",
    )


def generate_fuzz_mutations() -> List[tuple[str, str, TransactionProposal, Literal["SAFE", "KNOWN_BAD", "UNPARSEABLE"]]]:
    """
    Generates a deterministic corpus of 100+ mutations spanning:
    recipient, amount, contract, chain, nonce, selector, calldata length, hex encoding.
    """
    mutations = []

    # 1. Baseline SAFE variants (5 variations)
    for i, amt in enumerate([1_000_000, 10_000_000, 20_000_000, 35_000_000, 50_000_000]):
        p = TransactionProposal(
            chain_id=CHAIN_ID_SEPOLIA,
            to=SEPOLIA_USDC_CONTRACT,
            value=0,
            data=encode_erc20_transfer(ALICE_ADDRESS, amt),
            nonce=i,
        )
        mutations.append(("safe_baseline", f"Authorized {amt // 1_000_000} USDC to Alice", p, "SAFE"))

    # 2. Recipient Mutations (KNOWN_BAD)
    unauthorized_recipients = [
        (MALLORY_ADDRESS, "Attacker Mallory"),
        (BOB_ADDRESS, "Unauthorized peer Bob"),
        ("0x0000000000000000000000000000000000000000", "Zero Address"),
        ("0x000000000000000000000000000000000000dead", "Dead address"),
        ("0x1111111111111111111111111111111111111111", "Arbitrary external address"),
        ("0x2222222222222222222222222222222222222222", "Attacker proxy contract"),
    ]
    for addr, desc in unauthorized_recipients:
        p = TransactionProposal(
            chain_id=CHAIN_ID_SEPOLIA,
            to=SEPOLIA_USDC_CONTRACT,
            value=0,
            data=encode_erc20_transfer(addr, 20_000_000),
            nonce=0,
        )
        mutations.append(("recipient_mutation", f"Recipient diverted to {desc}", p, "KNOWN_BAD"))

    # 3. Amount Inflation Mutations (KNOWN_BAD)
    inflation_amounts = [
        (50_000_001, "50.000001 USDC (1 unit over limit)"),
        (51_000_000, "51 USDC"),
        (75_000_000, "75 USDC"),
        (100_000_000, "100 USDC"),
        (500_000_000, "500 USDC"),
        (5_000_000_000, "5,000 USDC"),
        (2**256 - 1, "Max uint256 overflow attempt"),
    ]
    for amt, desc in inflation_amounts:
        p = TransactionProposal(
            chain_id=CHAIN_ID_SEPOLIA,
            to=SEPOLIA_USDC_CONTRACT,
            value=0,
            data=encode_erc20_transfer(ALICE_ADDRESS, amt),
            nonce=0,
        )
        mutations.append(("amount_inflation", f"Amount inflated: {desc}", p, "KNOWN_BAD"))

    # 4. Target Contract Mutations (KNOWN_BAD)
    unauthorized_contracts = [
        (SEPOLIA_WETH_CONTRACT, "WETH contract"),
        ("0x000000000000000000000000000000000000dead", "Burn contract"),
        ("0x6B175474E89094C44Da98b954EedeAC495271d0F", "Mainnet DAI contract"),
        ("0x9999999999999999999999999999999999999999", "Phishing token contract"),
    ]
    for c_addr, desc in unauthorized_contracts:
        p = TransactionProposal(
            chain_id=CHAIN_ID_SEPOLIA,
            to=c_addr,
            value=0,
            data=encode_erc20_transfer(ALICE_ADDRESS, 20_000_000),
            nonce=0,
        )
        mutations.append(("contract_mutation", f"Target replaced with {desc}", p, "KNOWN_BAD"))

    # 5. Chain ID Drift Mutations (KNOWN_BAD)
    drift_chains = [
        (CHAIN_ID_BASE_SEPOLIA, "Base Sepolia (84532)"),
        (CHAIN_ID_ETHEREUM_MAINNET, "Ethereum Mainnet (1)"),
        (10, "Optimism Mainnet (10)"),
        (42161, "Arbitrum One (42161)"),
        (137, "Polygon PoS (137)"),
        (999999, "Unknown custom chain (999999)"),
    ]
    for cid, desc in drift_chains:
        p = TransactionProposal(
            chain_id=cid,
            to=SEPOLIA_USDC_CONTRACT,
            value=0,
            data=encode_erc20_transfer(ALICE_ADDRESS, 20_000_000),
            nonce=0,
        )
        mutations.append(("chain_drift", f"Chain mutated to {desc}", p, "KNOWN_BAD"))

    # 6. Unauthorized Method Selector Mutations (KNOWN_BAD / UNPARSEABLE)
    # approve: 0x095ea7b3
    p_approve = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data="0x095ea7b3" + encode_erc20_transfer(MALLORY_ADDRESS, 100_000_000)[10:],
        nonce=0,
    )
    mutations.append(("method_selector", "Unauthorized approve() selector", p_approve, "UNPARSEABLE"))

    # transferFrom: 0x23b872dd
    p_transfer_from = TransactionProposal(
        chain_id=CHAIN_ID_SEPOLIA,
        to=SEPOLIA_USDC_CONTRACT,
        value=0,
        data="0x23b872dd" + "00" * 32,
        nonce=0,
    )
    mutations.append(("method_selector", "Unauthorized transferFrom() selector", p_transfer_from, "UNPARSEABLE"))

    # Unknown arbitrary 4-byte selectors
    for sel in ["0xdeadbeef", "0x12345678", "0xabcdef01", "0x44445555"]:
        p_sel = TransactionProposal(
            chain_id=CHAIN_ID_SEPOLIA,
            to=SEPOLIA_USDC_CONTRACT,
            value=0,
            data=f"{sel}00000000000000000000000070997970c51812dc3a010c7d01b50e0d17dc79c8",
            nonce=0,
        )
        mutations.append(("unknown_selector", f"Unknown selector {sel}", p_sel, "UNPARSEABLE"))

    # 7. Calldata Truncation & Length Mutations (UNPARSEABLE)
    truncated_samples = [
        ("0xa9059cbb", "Selector only (4 bytes)"),
        ("0xa9059cbbdead", "Truncated 6 bytes"),
        ("0xa9059cbb" + "00" * 16, "Truncated 20 bytes"),
        ("0xa9059cbb" + "00" * 32, "Truncated 36 bytes (missing amount)"),
        ("0xa9059cbb" + "00" * 63, "Truncated 67 bytes (1 byte short)"),
    ]
    for raw_hex, desc in truncated_samples:
        p = TransactionProposal(
            chain_id=CHAIN_ID_SEPOLIA,
            to=SEPOLIA_USDC_CONTRACT,
            value=0,
            data=raw_hex,
            nonce=0,
        )
        mutations.append(("calldata_truncation", f"Malformed length: {desc}", p, "UNPARSEABLE"))

    # 8. Hex Encoding Corruption (UNPARSEABLE)
    hex_corruptions = [
        ("0xa9059cbb0", "Odd-length hex string"),
        ("0xZZZZZZZZ", "Non-hex characters"),
        ("not_hex_at_all", "Plaintext string in calldata"),
        ("0x" + "g" * 68, "Invalid hex chars in address"),
    ]
    for raw_data, desc in hex_corruptions:
        p = TransactionProposal(
            chain_id=CHAIN_ID_SEPOLIA,
            to=SEPOLIA_USDC_CONTRACT,
            value=0,
            data=raw_data,
            nonce=0,
        )
        mutations.append(("encoding_corruption", f"Corrupted hex: {desc}", p, "UNPARSEABLE"))

    # 9. Extended randomized mutations to exceed 100 total variations
    rng = random.Random(42)  # Deterministic seed for reproducible testing
    for i in range(75):
        mtype = rng.choice(["recipient", "amount", "contract", "chain", "selector", "calldata"])
        if mtype == "recipient":
            rnd_addr = f"0x{rng.getrandbits(160):040x}"
            p = TransactionProposal(
                chain_id=CHAIN_ID_SEPOLIA,
                to=SEPOLIA_USDC_CONTRACT,
                value=0,
                data=encode_erc20_transfer(rnd_addr, 20_000_000),
                nonce=i,
            )
            mutations.append(("fuzz_random_recipient", f"Random recipient {rnd_addr[:10]}...", p, "KNOWN_BAD"))
        elif mtype == "amount":
            rnd_amt = rng.randint(50_000_001, 10_000_000_000)
            p = TransactionProposal(
                chain_id=CHAIN_ID_SEPOLIA,
                to=SEPOLIA_USDC_CONTRACT,
                value=0,
                data=encode_erc20_transfer(ALICE_ADDRESS, rnd_amt),
                nonce=i,
            )
            mutations.append(("fuzz_random_amount", f"Random inflated amount {rnd_amt}", p, "KNOWN_BAD"))
        elif mtype == "contract":
            rnd_contract = f"0x{rng.getrandbits(160):040x}"
            p = TransactionProposal(
                chain_id=CHAIN_ID_SEPOLIA,
                to=rnd_contract,
                value=0,
                data=encode_erc20_transfer(ALICE_ADDRESS, 20_000_000),
                nonce=i,
            )
            mutations.append(("fuzz_random_contract", f"Random target contract {rnd_contract[:10]}...", p, "KNOWN_BAD"))
        elif mtype == "chain":
            rnd_chain = rng.choice([1, 10, 56, 137, 8453, 42161, 43114, 84532])
            p = TransactionProposal(
                chain_id=rnd_chain,
                to=SEPOLIA_USDC_CONTRACT,
                value=0,
                data=encode_erc20_transfer(ALICE_ADDRESS, 20_000_000),
                nonce=i,
            )
            mutations.append(("fuzz_random_chain", f"Random chain drift: chain {rnd_chain}", p, "KNOWN_BAD"))
        elif mtype == "selector":
            rnd_sel = f"0x{rng.getrandbits(32):08x}"
            p = TransactionProposal(
                chain_id=CHAIN_ID_SEPOLIA,
                to=SEPOLIA_USDC_CONTRACT,
                value=0,
                data=f"{rnd_sel}" + "00" * 32,
                nonce=i,
            )
            mutations.append(("fuzz_random_selector", f"Random selector {rnd_sel}", p, "UNPARSEABLE"))
        else:
            rnd_len = rng.randint(1, 60)
            rnd_hex = f"0x{rng.getrandbits(rnd_len * 4):0{rnd_len}x}"
            p = TransactionProposal(
                chain_id=CHAIN_ID_SEPOLIA,
                to=SEPOLIA_USDC_CONTRACT,
                value=0,
                data=rnd_hex,
                nonce=i,
            )
            mutations.append(("fuzz_random_calldata", f"Random truncated calldata length {rnd_len}", p, "UNPARSEABLE"))

    return mutations


def run_mutation_fuzz_campaign(limit: Optional[int] = None) -> FuzzCampaignReport:
    """
    Executes the W16 Mutation-Fuzz Campaign against ChainBreakExecutor.
    Verifies 100% deterministic classification and 0 false allowances.
    """
    intent = create_fuzz_intent()
    mutations = generate_fuzz_mutations()
    if limit is not None:
        mutations = mutations[:limit]

    adapter = LocalEVMAdapter()
    executor = ChainBreakExecutor(adapter=adapter)

    results: List[FuzzMutationResult] = []
    safe_allowed = 0
    known_bad_blocked = 0
    unparseable_held = 0
    false_allows = 0
    unhandled_exceptions = 0

    for idx, (mtype, desc, proposal, expected_cls) in enumerate(mutations):
        # Reset state before each fuzz to test atomic mutation classification
        state = TrajectoryState(
            session_id=f"fuzz_{idx}",
            agent_id="fuzz_agent",
            intent_id=intent.intent_id,
            cumulative_spend_per_asset={},
        )
        try:
            receipt, _ = executor.process(intent, state, proposal)
            actual_dec = receipt.decision

            if expected_cls == "SAFE":
                passed = (actual_dec == Decision.ALLOW and receipt.broadcast)
                if passed:
                    safe_allowed += 1
                else:
                    passed = False
            elif expected_cls == "KNOWN_BAD":
                passed = (actual_dec == Decision.BLOCK and not receipt.broadcast)
                if passed:
                    known_bad_blocked += 1
                elif actual_dec == Decision.ALLOW:
                    false_allows += 1
            elif expected_cls == "UNPARSEABLE":
                passed = (actual_dec == Decision.HOLD and not receipt.broadcast)
                if passed:
                    unparseable_held += 1
                elif actual_dec == Decision.ALLOW:
                    false_allows += 1

            res = FuzzMutationResult(
                mutation_index=idx,
                mutation_type=mtype,
                description=desc,
                expected_classification=expected_cls,
                actual_decision=actual_dec,
                passed=passed,
                broadcast=receipt.broadcast,
                reason=receipt.reason or receipt.hold_reason or "",
            )
            results.append(res)
        except Exception as exc:
            unhandled_exceptions += 1
            results.append(
                FuzzMutationResult(
                    mutation_index=idx,
                    mutation_type=mtype,
                    description=desc,
                    expected_classification=expected_cls,
                    actual_decision=Decision.BLOCK,
                    passed=False,
                    broadcast=False,
                    reason=f"CRASH: {str(exc)}",
                )
            )

    all_invariants_held = (false_allows == 0 and unhandled_exceptions == 0)

    summary = (
        f"W16 Fuzz Campaign Completed: {len(results)} total mutations evaluated. "
        f"Safe Allowed: {safe_allowed}, Known Bad Blocked: {known_bad_blocked}, "
        f"Unparseable Held: {unparseable_held}. False Allows: {false_allows}, "
        f"Unhandled Crashes: {unhandled_exceptions}."
    )

    return FuzzCampaignReport(
        total_mutations=len(results),
        safe_allowed=safe_allowed,
        known_bad_blocked=known_bad_blocked,
        unparseable_held=unparseable_held,
        false_allows=false_allows,
        unhandled_exceptions=unhandled_exceptions,
        all_invariants_held=all_invariants_held,
        summary=summary,
        sample_results=results[:20],  # Keep 20 sample results for telemetry
    )
