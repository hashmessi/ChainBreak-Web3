# Phase 7 Plan: Execution Substrates (Local EVM + Live Testnet)

## Goal
Implement dual execution adapters: `LocalEVMAdapter` for 100% deterministic offline demo replay and `TestnetEVMAdapter` for public testnet execution with live explorer proof, maintaining pre-signing execution gating across both substrates.

## Requirements Covered
- `CHAIN-01`: `LocalEVMAdapter` with deterministic address fixtures, local state balance tracking, and simulated broadcast for bulletproof offline execution.
- `CHAIN-02`: `TestnetEVMAdapter` supporting real broadcast on public EVM testnet (Sepolia/Base Sepolia) for allowed transactions, returning explorer URLs while guaranteeing zero onchain execution on blocked transactions.

## Architecture & Design Decisions
1. **Module Location**:
   - `backend/chain/adapter.py`: Protocol & base types.
   - `backend/chain/local_evm.py`: Pure-Python in-memory EVM state simulator.
   - `backend/chain/testnet.py`: Pure-Python JSON-RPC testnet adapter (using standard `httpx` or raw RPC, no heavy dependencies).
2. **LocalEVMAdapter Design**:
   - Tracks simulated native ETH and ERC-20 balances for standard fixtures (`ALICE`, `BOB`, `MALLORY`, `OPERATOR`).
   - `sign_and_broadcast(proposal)`: Validates nonce, increments nonce, executes balance transfer, generates deterministic transaction hash (`0x...`), records receipt.
   - 100% offline, zero internet or faucet dependency.
3. **TestnetEVMAdapter Design**:
   - Configurable RPC URL (`SEPOLIA_RPC_URL` / `https://ethereum-sepolia-rpc.publicnode.com`) and private key (`SEPOLIA_PRIVATE_KEY`).
   - Fallback mode: If no private key or network unavailable, returns simulated testnet transaction hash with public Etherscan URL for demonstration.
   - Explorer URL helper: `get_explorer_url(tx_hash, chain_id) -> str`.
   - Security guarantee: When called through `ChainBreakExecutor`, blocked transactions never touch `sign_and_broadcast`, executing 0 onchain transactions.

## Implementation Steps
1. Create `backend/chain/adapter.py` defining `ExecutionAdapter` and factory helpers.
2. Create `backend/chain/local_evm.py` implementing `LocalEVMAdapter`.
3. Create `backend/chain/testnet.py` implementing `TestnetEVMAdapter`.
4. Update `backend/main.py` API endpoints to support substrate selection (`local` vs `testnet`) in `/api/run` and `/api/counterfactual`.
5. Create comprehensive test suite in `backend/tests/test_execution_substrates.py`.

## Verification
- Run `pytest backend/tests/test_execution_substrates.py`
- Verify local EVM balance updates on ALLOW, zero balance changes on BLOCK.
- Verify testnet adapter explorer URL generation and non-call guarantee on BLOCK.
