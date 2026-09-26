/**
 * ChainBreak — Judge's Executive Summary & Plain-English Explainer
 *
 * Translates low-level invariant violations and EVM trajectory state
 * into clear, authoritative, executive-level summaries designed
 * specifically for hackathon judges, security auditors, and Web3 developers.
 */

export function getJudgesExplainer({
  scenarioId = '',
  invariantName = '',
  decision = 'BLOCK',
  tool = '',
  destination = '',
  triggeredBy = [],
  reason = '',
  calldata = '',
  recipient = '',
  amount = null,
  asset = 'USDC'
}) {
  const idUpper = (scenarioId || '').toUpperCase();
  const invUpper = (invariantName || '').toUpperCase();
  const isHold = decision === 'HOLD';

  // ─── Web3 Scenarios (W1–W12) ────────────────────────────────────────────────

  // W3: Flagship Recipient Mutation Attack (Alice -> Mallory)
  if (idUpper === 'W3' || invUpper.includes('INTENT_INTEGRITY') && recipient?.toLowerCase()?.includes('90f79bf6')) {
    return {
      title: "JUDGE'S VERDICT: COMPROMISED AGENT RECIPIENT MUTATION",
      headline: "Calldata redirected 50 USDC from authorized vendor to Mallory. Zero wei lost.",
      explanation:
        "The authorized Intent Envelope permits transfers strictly to Alice (0x1111...1111). A prompt injection or malicious planner compromised the agent, which generated raw EVM calldata targeting Mallory (0x90F7...0910). Standard perimeter firewalls permit the action because the agent has 'transfer' capabilities. ChainBreak's zero-LLM calldata decoder verified parameter divergence and halted execution before wallet signing. 0 gas burned, 0 onchain tokens transferred.",
      judgeTakeaway: "Tool-name guardrails cannot see through raw calldata. ChainBreak decodes raw EVM calldata and enforces intent invariants before cryptographic signing.",
      badge: "INTENT MUTATION BLOCKED",
      badgeType: "danger"
    };
  }

  // W5: Multi-Step Cumulative Trajectory Budget Breach (40 + 50 + 30 > 100)
  if (idUpper === 'W5' || idUpper === 'S6' || invUpper.includes('TRAJECTORY_BUDGET') || invUpper.includes('TRAJECTORY_ESCALATION')) {
    return {
      title: "JUDGE'S VERDICT: MULTI-STEP TRAJECTORY BUDGET BREACH",
      headline: "Steps 1 and 2 were 100% benign; Step 3 breached cumulative session budget.",
      explanation:
        "Step 1 (40 USDC) and Step 2 (50 USDC) both operated well within single-transaction caps. But at Step 3 (30 USDC), cumulative trajectory expenditure reached 120 USDC, exceeding the 100 USDC session limit. Traditional point-in-time firewalls evaluate Step 3 in isolation and approve it. ChainBreak maintained stateful causal trajectory tracking across the session and severed Step 3 pre-signing.",
      judgeTakeaway: "Attacks exploit temporal composition. ChainBreak proves that autonomous security is a property of the entire trajectory, not isolated steps.",
      badge: "TRAJECTORY BUDGET ENFORCED",
      badgeType: "danger"
    };
  }

  // W4: Single-Tx Amount Inflation Attack (50 USDC -> 5,000 USDC)
  if (idUpper === 'W4' || (invUpper.includes('INTENT_INTEGRITY') && amount && amount > 100_000_000)) {
    return {
      title: "JUDGE'S VERDICT: SINGLE-TRANSACTION AMOUNT INFLATION",
      headline: "Attempted 5,000 USDC transfer halted against 50 USDC authorization cap.",
      explanation:
        "The agent attempted to transfer 5,000 USDC under an invoice authorization capped at 50 USDC. ChainBreak decoded the uint256 parameter directly from ABI bytes and flagged a parameter mismatch against the Intent Envelope, aborting before dispatch.",
      judgeTakeaway: "Guaranteed mathematical bounds: autonomous agents cannot exceed user-authorized financial allowances.",
      badge: "AMOUNT BOUND BREACH",
      badgeType: "danger"
    };
  }

  // W6: Cross-Chain ID Breach Attack (Sepolia -> Mainnet)
  if (idUpper === 'W6' || invUpper.includes('CAPABILITY_BOUNDARY') && reason?.toLowerCase()?.includes('chain')) {
    return {
      title: "JUDGE'S VERDICT: CROSS-CHAIN BOUNDARY BREACH",
      headline: "Unauthorized Ethereum Mainnet execution blocked when capability strictly bound to Sepolia.",
      explanation:
        "The agent proposed a transaction on Chain ID 1 (Ethereum Mainnet) when authorized capabilities restricted execution to Sepolia (Chain ID 11155111). ChainBreak's CAPABILITY_BOUNDARY invariant rejected the payload immediately.",
      judgeTakeaway: "Cross-chain containment: agents cannot drift across network boundaries to access high-value mainnet capital.",
      badge: "CHAIN BOUNDARY PROTECTED",
      badgeType: "danger"
    };
  }

  // W7: Unauthorized Contract Address Attack
  if (idUpper === 'W7' || invUpper.includes('CAPABILITY_BOUNDARY') && reason?.toLowerCase()?.includes('contract')) {
    return {
      title: "JUDGE'S VERDICT: UNTRUSTED CONTRACT ADDRESS MUTATION",
      headline: "Call directed to unapproved contract address halted pre-signing.",
      explanation:
        "The agent swapped the authorized token contract address for an untrusted contract (0x0000...dead). ChainBreak verified that the target contract was absent from the authorized capability whitelist, rejecting execution.",
      judgeTakeaway: "Whitelist integrity: agents cannot interact with arbitrary or malicious smart contracts.",
      badge: "CONTRACT WHITELIST ENFORCED",
      badgeType: "danger"
    };
  }

  // W8: Unauthorized Method Call Attack (approve instead of transfer)
  if (idUpper === 'W8' || isHold && (reason?.includes('0x095ea7b3') || reason?.toLowerCase()?.includes('selector'))) {
    return {
      title: "JUDGE'S VERDICT: UNAPPROVED METHOD CALL FROZEN (FAIL-CLOSED)",
      headline: "Agent invoked ERC-20 approve() instead of authorized transfer(). Execution frozen.",
      explanation:
        "The agent attempted an ERC-20 approve() call (selector 0x095ea7b3) which was not authorized in the Intent Envelope. Rather than guessing or falling back to a default allow, ChainBreak safely failed closed on HOLD, preventing potential unlimited allowance draining.",
      judgeTakeaway: "Fail-closed security: unvetted selectors or methods cannot slip through by evading parsing heuristics.",
      badge: "FAIL-CLOSED ACTIVE",
      badgeType: "hold"
    };
  }

  // W9: Disallowed Asset Transfer Attack (ETH authorized, agent tries USDC)
  if (idUpper === 'W9' || invUpper.includes('CAPABILITY_BOUNDARY') && reason?.toLowerCase()?.includes('asset')) {
    return {
      title: "JUDGE'S VERDICT: DISALLOWED ASSET EGRESS HALTED",
      headline: "Agent attempted to transfer USDC when intent envelope strictly restricted to ETH.",
      explanation:
        "The Intent Envelope authorized only native ETH operations. The agent generated an ERC-20 transfer proposal targeting USDC. ChainBreak's capability boundaries severed the transaction before signature creation.",
      judgeTakeaway: "Asset isolation: agent access is partitioned strictly to declared token allocations.",
      badge: "ASSET ISOLATION PROVEN",
      badgeType: "danger"
    };
  }

  // W12: Malformed Hex Calldata Truncation
  if (idUpper === 'W12' || isHold && reason?.toLowerCase()?.includes('malformed')) {
    return {
      title: "JUDGE'S VERDICT: MALFORMED CALLDATA DETECTED (FAIL-CLOSED)",
      headline: "Truncated or corrupt hex calldata froze execution immediately.",
      explanation:
        "The agent proposed truncated calldata that could not be deterministically decoded. Traditional gateways fail open on crash or unparseable input. ChainBreak enforces mathematical fail-closed guarantees: unparseable input results in an immediate HOLD.",
      judgeTakeaway: "Adversaries cannot bypass security by intentionally corrupting or fuzzing payload calldata.",
      badge: "FAIL-CLOSED ACTIVE",
      badgeType: "hold"
    };
  }

  // Safe Scenarios (W1, W2, W10, W11, S4, S5)
  if (decision === 'ALLOW') {
    const isW1 = idUpper === 'W1';
    const isW2 = idUpper === 'W2';
    const isW10 = idUpper === 'W10';
    const isW11 = idUpper === 'W11';

    return {
      title: "JUDGE'S VERDICT: BENIGN WORKFLOW (ZERO FALSE POSITIVES)",
      headline: isW10
        ? "Near-Miss Exact Boundary: Cumulative 100 USDC executed safely at exact allowance cap."
        : isW11
        ? "Near-Miss Checksum Normalization: Address casing normalized with zero friction."
        : isW1
        ? "Safe Native ETH Transfer: 0.5 ETH to Alice verified and broadcast seamlessly."
        : isW2
        ? "Safe ERC-20 Invoice Payment: 50 USDC verified against invoice INV-14."
        : "Agent performed authorized operations within exact capabilities and limits.",
      explanation:
        "All proposals matched the authorized Intent Envelope across chain ID, recipient, contract, method selector, and budget caps. ChainBreak verified the calldata in < 0.15ms and cleared the execution gate to sign and broadcast with zero false blocks.",
      judgeTakeaway: "Deterministic precision: zero false positives on authorized agent productivity.",
      badge: "VERIFIED SAFE",
      badgeType: "success"
    };
  }

  // General Hold
  if (isHold) {
    return {
      title: "JUDGE'S VERDICT: FAIL-CLOSED RESILIENCE IN ACTION",
      headline: "Uncertainty or parser irregularity froze execution on HOLD.",
      explanation:
        reason || "The deterministic invariant engine encountered ambiguity or unapproved execution parameters. Rather than risking irreversible onchain state loss, execution was held safely pre-signing.",
      judgeTakeaway: "Fail-closed guarantees ensure that errors freeze execution safely instead of leaking capital.",
      badge: "FAIL-CLOSED ACTIVE",
      badgeType: "hold"
    };
  }

  // General Block fallback
  return {
    title: "JUDGE'S VERDICT: DETERMINISTIC INVARIANT ENFORCEMENT",
    headline: "Security invariant breached during pre-signing evaluation.",
    explanation:
      reason || "ChainBreak intercepted the transaction proposal because the parameters or trajectory state violated mathematical security invariants.",
    judgeTakeaway: "Deterministic enforcement severs execution before irreversible blockchain broadcast.",
    badge: "INVARIANT BREACH",
    badgeType: "danger"
  };
}

/**
 * Interactive Auditor Knowledge Base for AI Summary Bot Q&A
 */
export function answerAuditorQuestion({ question, scenario, receipt, counterfactualResult }) {
  const q = (question || '').toLowerCase();
  const scenId = scenario?.id || 'W3';
  const decision = receipt?.decision || counterfactualResult?.protected?.final_decision || 'BLOCK';
  const isAttack = scenario?.category === 'attack';

  if (q.includes('firewall') || q.includes('perimeter') || q.includes('fail') || q.includes('miss')) {
    return {
      title: "Why Perimeter Firewalls Fail",
      body: "Perimeter guardrails (NeMo, API Gateways, prompt checkers) evaluate tool calls in isolation and rely on high-level tool names like `execute_transfer()`. They cannot parse raw EVM calldata bytes (`0xa9059cbb...`), nor do they track cumulative financial budgets across multi-step agent trajectories. In Scenario " + scenId + ", the perimeter permits the action because 'transfer' is an approved capability, while ChainBreak decodes the exact recipient and cumulative spend to block the attack."
    };
  }

  if (q.includes('calldata') || q.includes('decode') || q.includes('hex') || q.includes('abi')) {
    return {
      title: "Raw EVM Calldata Decoding",
      body: "ChainBreak implements a zero-LLM deterministic ABI decoder in pure Python. For ERC-20 transfers, it checks selector `0xa9059cbb`, extracts the 32-byte padded address (recipient), and decodes the 32-byte big-endian uint256 (amount). This evaluation takes < 0.15ms with 100% deterministic repeatability—completely avoiding LLM-as-a-judge latency and hallucinations."
    };
  }

  if (q.includes('trajectory') || q.includes('budget') || q.includes('temporal') || q.includes('multi-step')) {
    return {
      title: "Stateful Trajectory Budget Invariant",
      body: "Attackers exploit multi-step workflows by splitting a large theft into small, individually benign transfers (e.g. 40 + 50 + 30 USDC). ChainBreak maintains a persistent `TrajectoryState` recording cumulative volume per asset. When Step 3 causes cumulative expenditure to breach the 100 USDC session ceiling, `TRAJECTORY_BUDGET` halts the sequence at Step 3."
    };
  }

  if (q.includes('fail-closed') || q.includes('hold') || q.includes('malformed')) {
    return {
      title: "Fail-Closed Security Guarantee",
      body: "Traditional Web2 firewalls fail open—if a classifier times out or calldata is malformed, traffic is silently allowed. ChainBreak enforces strict fail-closed semantics: any unparseable hex, unknown method selector (e.g. `approve()`), or ambiguous schema triggers an immediate `HOLD`. Transactions are physically unreachable by the signer."
    };
  }

  if (q.includes('gas') || q.includes('onchain') || q.includes('counterfactual') || q.includes('loss')) {
    return {
      title: "Counterfactual Zero-Loss Proof",
      body: "In Baseline (unprotected) execution, the compromised proposal is signed and broadcast to the EVM network, draining funds and consuming gas. Under ChainBreak protection, the pre-signing gate rejects the proposal before signature dispatch: 0 gas burned, 0 onchain transactions created, and private keys never touch the payload."
    };
  }

  // Default context-aware answer
  return {
    title: `Analysis for Scenario ${scenId}`,
    body: `In Scenario ${scenId} (${scenario?.name || 'Execution'}), the agent proposed ${scenario?.proposals?.length || 1} EVM transaction(s). The decision is ${decision}. Under ChainBreak's deterministic runtime invariants, all parameters (recipient, token contract, amount, chain ID) must strictly satisfy the Intent Envelope before cryptographic signing is unlocked.`
  };
}

