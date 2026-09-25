# Phase 2 Plan: Deterministic EVM Calldata Decoder

## Goal
Implement a 100% pure-Python deterministic EVM calldata decoder for native ETH transfers and standard ERC-20 `transfer(address,uint256)` transactions with fail-closed error handling and zero LLM dependencies.

## Requirements Covered
- `DEC-01`: Deterministic native ETH transfer decoder (`data == ""` or empty calldata with `value > 0` or `value >= 0`). Extracts recipient from `tx.to` and amount from `tx.value`. Raw EVM fields are the sole authority.
- `DEC-02`: Deterministic ERC-20 `transfer(address,uint256)` calldata decoder. Identifies selector `0xa9059cbb`, decodes 32-byte right-padded recipient address from `calldata[4:36]`, decodes 32-byte big-endian uint256 amount from `calldata[36:68]`, and sets token contract address to `tx.to`. Any other 4-byte selector is not guessed.
- `DEC-03`: Strict fail-closed error handling. Malformed hex, unrecognized selector, truncated arguments, or decoding exceptions return `DecodeResult(parseable=False, hold_reason="<specific reason>")` to drive a `HOLD` decision. The decoder never raises unhandled exceptions.
- `DEC-04`: 100% pure Python implementation with zero LLM calls, zero RPC calls, and zero network I/O.

## Architecture & Design Decisions
1. **Module Location**: `backend/chain/decoder.py` and `backend/chain/fixtures.py`.
2. **Decoder Function Contract**:
   ```python
   def decode_evm_transaction(proposal: TransactionProposal, token_symbol_map: dict[str, str] | None = None) -> DecodeResult:
       ...
   ```
3. **DecodeResult Model**:
   ```python
   class DecodeResult(BaseModel):
       parseable: bool
       decoded: DecodedEvmTransaction | None = None
       hold_reason: str | None = None
   ```
4. **Calldata Parsing Rules**:
   - Strip leading `0x` if present, convert to lowercase.
   - If hex string length is odd or contains invalid characters -> `hold_reason="MALFORMED_HEX"`.
   - Convert hex string to `bytes`.
   - If `len(calldata_bytes) == 0`:
     - If `proposal.to` is valid hex address (20 bytes):
       - Parse as native ETH transfer. Asset = `"ETH"`, method = `"transfer"`, contract = `proposal.to` (or `"NATIVE"`), recipient = `proposal.to`, amount = `proposal.value`.
     - Else:
       - `hold_reason="INVALID_RECIPIENT_ADDRESS"`
   - If `len(calldata_bytes) > 0`:
     - If `len(calldata_bytes) < 4`: `hold_reason="TRUNCATED_CALLDATA_HEADER"`
     - Selector = `calldata_bytes[:4].hex()`
     - If selector == `"a9059cbb"` (ERC-20 `transfer(address,uint256)`):
       - Must have exactly 68 bytes (or >= 68 bytes). If `len(calldata_bytes) < 68`: `hold_reason="TRUNCATED_ERC20_ARGUMENTS"`.
       - Recipient: extract last 20 bytes of `calldata_bytes[4:36]` -> format as checksummed hex string (`0x...`).
       - Amount: `int.from_bytes(calldata_bytes[36:68], byteorder="big")`.
       - Contract: `proposal.to`.
       - Asset: looked up from `token_symbol_map` or default symbol associated with known contract fixture or `"ERC20"`.
       - Calldata hash: `sha256(calldata_bytes).hexdigest()`.
     - Else (unknown selector):
       - `hold_reason=f"UNKNOWN_SELECTOR:0x{selector}"`
5. **Robust Exception Shield**: Entire function is wrapped in try/except catching `Exception` and returning `DecodeResult(parseable=False, hold_reason="DECODER_EXCEPTION: ...")`.

## Implementation Steps
1. Create `backend/chain/__init__.py`.
2. Create `backend/chain/fixtures.py` containing standard testnet/local fixtures (e.g. Sepolia USDC contract address `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`, Alice address, Bob address, Mallory address).
3. Create `backend/chain/decoder.py` implementing `decode_evm_transaction`, `encode_erc20_transfer`, and helper formatting functions.
4. Create comprehensive test suite in `backend/tests/test_decoder.py` testing:
   - Safe native ETH transfer
   - Safe ERC20 USDC transfer
   - Truncated calldata (less than 4 bytes, less than 68 bytes)
   - Malformed non-hex string
   - Unknown selector (e.g. `0x095ea7b3` approve, or random `0x12345678`)
   - Zero amount, large uint256 amounts, max uint256
   - Exception handling and zero crash guarantee.

## Verification
- Run `pytest backend/tests/test_decoder.py`
- Verify pure Python operation, zero network dependencies, 100% deterministic outputs.
