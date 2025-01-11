// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/* ─────────────────────────────────────────────────────────────────────────────
 *  BioChain – IPNFTRegistry
 *  -----------------------------------------------------------------------------
 *  An ERC-1155 registry for fractionalized clinical trial Intellectual Property
 *  NFTs ("IP-NFTs"). Each token id represents a single research trial; the
 *  fungible supply under that id represents fractional investor shares.
 *
 *  Core behaviors:
 *    • Researchers MINT a trial, defining funding goals and a milestone schedule.
 *    • Investors BUY fractional shares (paid in native token) at a fixed price.
 *    • Funds are LOCKED in escrow per-trial and released milestone-by-milestone.
 *    • A whitelisted set of "Verifier Labs" can SIGN the IP-NFT after running
 *      validation tests — building a decentralized peer-review trust score.
 *    • Off-chain clinical data is anchored on-chain via a SHA-256 root hash,
 *      producing an immutable audit trail for regulators.
 *
 *  Self-contained: this file intentionally does not import OpenZeppelin so it
 *  can be reviewed in isolation. ERC-1155, Ownable, and ReentrancyGuard
 *  primitives are implemented inline below to a minimal, audited surface.
 * ──────────────────────────────────────────────────────────────────────────── */

// ─── Minimal ERC-1155 receiver interface ──────────────────────────────────────
interface IERC1155Receiver {
    function onERC1155Received(
        address operator,
        address from,
        uint256 id,
        uint256 value,
        bytes calldata data
    ) external returns (bytes4);

    function onERC1155BatchReceived(
        address operator,
        address from,
        uint256[] calldata ids,
        uint256[] calldata values,
        bytes calldata data
    ) external returns (bytes4);
}

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

// ─── Reentrancy guard ─────────────────────────────────────────────────────────
abstract contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;
    uint256 private _status = _NOT_ENTERED;

    error ReentrantCall();

    modifier nonReentrant() {
        if (_status == _ENTERED) revert ReentrantCall();
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

// ─── Ownable (single admin, transferable) ─────────────────────────────────────
abstract contract Ownable {
    address private _owner;

    error NotOwner();
    error ZeroAddress();

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor(address initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }

    modifier onlyOwner() {
        if (msg.sender != _owner) revert NotOwner();
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

// ─── Minimal ERC-1155 implementation ──────────────────────────────────────────
abstract contract ERC1155 is IERC165 {
    mapping(uint256 => mapping(address => uint256)) internal _balances;
    mapping(address => mapping(address => bool)) internal _operatorApprovals;

    string internal _uriBase;

    error InsufficientBalance();
    error LengthMismatch();
    error NotApproved();
    error UnsafeRecipient();
    error ZeroAddressTransfer();

    event TransferSingle(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256 id,
        uint256 value
    );
    event TransferBatch(
        address indexed operator,
        address indexed from,
        address indexed to,
        uint256[] ids,
        uint256[] values
    );
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == 0xd9b67a26 || // ERC-1155
            interfaceId == 0x0e89341c;   // ERC-1155 Metadata URI
    }

    function uri(uint256 /*id*/) public view virtual returns (string memory) {
        return _uriBase;
    }

    function balanceOf(address account, uint256 id) public view returns (uint256) {
        return _balances[id][account];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids)
        external
        view
        returns (uint256[] memory)
    {
        if (accounts.length != ids.length) revert LengthMismatch();
        uint256[] memory out = new uint256[](accounts.length);
        for (uint256 i; i < accounts.length; ++i) {
            out[i] = _balances[ids[i]][accounts[i]];
        }
        return out;
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external {
        if (from != msg.sender && !_operatorApprovals[from][msg.sender]) revert NotApproved();
        _safeTransferFrom(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) external {
        if (from != msg.sender && !_operatorApprovals[from][msg.sender]) revert NotApproved();
        if (ids.length != amounts.length) revert LengthMismatch();
        if (to == address(0)) revert ZeroAddressTransfer();

        for (uint256 i; i < ids.length; ++i) {
            uint256 id = ids[i];
            uint256 amount = amounts[i];
            uint256 fromBal = _balances[id][from];
            if (fromBal < amount) revert InsufficientBalance();
            unchecked {
                _balances[id][from] = fromBal - amount;
            }
            _balances[id][to] += amount;
        }
        emit TransferBatch(msg.sender, from, to, ids, amounts);
        _doSafeBatchTransferAcceptanceCheck(msg.sender, from, to, ids, amounts, data);
    }

    function _safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) internal {
        if (to == address(0)) revert ZeroAddressTransfer();
        uint256 fromBal = _balances[id][from];
        if (fromBal < amount) revert InsufficientBalance();
        unchecked {
            _balances[id][from] = fromBal - amount;
        }
        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, from, to, id, amount);
        _doSafeTransferAcceptanceCheck(msg.sender, from, to, id, amount, data);
    }

    function _mint(address to, uint256 id, uint256 amount, bytes memory data) internal {
        if (to == address(0)) revert ZeroAddressTransfer();
        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, address(0), to, id, amount);
        _doSafeTransferAcceptanceCheck(msg.sender, address(0), to, id, amount, data);
    }

    function _doSafeTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes memory data
    ) private {
        if (to.code.length == 0) return;
        try IERC1155Receiver(to).onERC1155Received(operator, from, id, amount, data) returns (
            bytes4 response
        ) {
            if (response != IERC1155Receiver.onERC1155Received.selector) revert UnsafeRecipient();
        } catch {
            revert UnsafeRecipient();
        }
    }

    function _doSafeBatchTransferAcceptanceCheck(
        address operator,
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory amounts,
        bytes memory data
    ) private {
        if (to.code.length == 0) return;
        try IERC1155Receiver(to).onERC1155BatchReceived(operator, from, ids, amounts, data)
        returns (bytes4 response) {
            if (response != IERC1155Receiver.onERC1155BatchReceived.selector)
                revert UnsafeRecipient();
        } catch {
            revert UnsafeRecipient();
        }
    }
}

/* ─────────────────────────────────────────────────────────────────────────────
 *  IPNFTRegistry
 * ──────────────────────────────────────────────────────────────────────────── */
contract IPNFTRegistry is ERC1155, Ownable, ReentrancyGuard {
    // ── Trial phases (mirror FDA / ICH-GCP nomenclature) ────────────────────
    enum Phase {
        Preclinical, // 0
        PhaseI,      // 1
        PhaseII,     // 2
        PhaseIII,    // 3
        PhaseIV      // 4
    }

    enum TrialStatus {
        Funding,    // open for fractional investment
        Active,     // funded; trial in progress
        Completed,  // all milestones released
        Cancelled   // failed / refundable
    }

    // ── Storage structs ──────────────────────────────────────────────────────
    struct Milestone {
        string description;       // human-readable e.g. "Phase II enrollment 50%"
        uint256 fundsBps;         // share of trial escrow released (in bps, 10_000 = 100%)
        bool released;            // funds disbursed?
        uint64 releasedAt;        // timestamp
        bytes32 evidenceHash;     // SHA-256 hash of off-chain evidence packet
    }

    struct Trial {
        // identity
        address researcher;
        string title;
        string therapeuticArea;
        Phase phase;
        string metadataURI;       // IPFS / Arweave pointer

        // tokenomics
        uint256 totalShares;      // fractional supply
        uint256 sharesSold;
        uint256 pricePerShare;    // wei per share
        uint256 fundingGoal;      // wei (must equal totalShares * pricePerShare)

        // escrow + lifecycle
        uint256 escrow;           // wei currently held for this trial
        uint256 released;         // wei already paid out to researcher
        TrialStatus status;
        uint64 createdAt;
        uint64 fundedAt;

        // peer review
        uint32 verifierSignatures; // count of unique verifier labs that signed
    }

    // ── State ────────────────────────────────────────────────────────────────
    uint256 public nextTokenId = 1;

    /// @dev tokenId → trial
    mapping(uint256 => Trial) private _trials;

    /// @dev tokenId → ordered milestone list
    mapping(uint256 => Milestone[]) private _milestones;

    /// @dev tokenId → list of SHA-256 anchored data hashes (audit trail)
    mapping(uint256 => bytes32[]) private _dataAnchors;

    /// @dev tokenId → verifier address → already signed?
    mapping(uint256 => mapping(address => bool)) public hasSigned;

    /// @dev tokenId → verifier addresses that signed (peer review roster)
    mapping(uint256 => address[]) private _signers;

    /// @dev investor refund ledger when a trial is cancelled
    mapping(uint256 => mapping(address => uint256)) public refundsOwed;

    /// @dev whitelisted laboratories permitted to perform peer review
    mapping(address => bool) public isVerifierLab;

    // ── Constants ────────────────────────────────────────────────────────────
    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_MILESTONES = 12;

    // ── Events ───────────────────────────────────────────────────────────────
    event TrialMinted(
        uint256 indexed tokenId,
        address indexed researcher,
        string title,
        Phase phase,
        uint256 totalShares,
        uint256 pricePerShare,
        uint256 fundingGoal
    );
    event SharesPurchased(
        uint256 indexed tokenId,
        address indexed investor,
        uint256 shares,
        uint256 amountPaid,
        uint256 sharesRemaining
    );
    event TrialFunded(uint256 indexed tokenId, uint256 totalRaised, uint64 fundedAt);
    event MilestoneReleased(
        uint256 indexed tokenId,
        uint256 indexed milestoneIndex,
        uint256 amount,
        bytes32 evidenceHash
    );
    event DataAnchored(
        uint256 indexed tokenId,
        uint256 indexed anchorIndex,
        bytes32 indexed dataHash,
        address submittedBy
    );
    event PeerReviewSigned(
        uint256 indexed tokenId,
        address indexed verifier,
        uint32 totalSignatures,
        bytes32 reviewHash
    );
    event VerifierLabUpdated(address indexed lab, bool approved);
    event TrialCancelled(uint256 indexed tokenId, uint256 refundPool);
    event RefundClaimed(uint256 indexed tokenId, address indexed investor, uint256 amount);

    // ── Errors ───────────────────────────────────────────────────────────────
    error TrialNotFound();
    error NotResearcher();
    error InvalidPhase();
    error InvalidConfiguration();
    error InvalidMilestoneSchedule();
    error MilestoneAlreadyReleased();
    error MilestoneOutOfRange();
    error TrialNotFunding();
    error TrialNotActive();
    error InsufficientShares();
    error IncorrectPayment();
    error EmptyHash();
    error NotVerifierLab();
    error AlreadySigned();
    error TransferFailed();
    error NothingToRefund();
    error NotCancellable();

    // ── Constructor ──────────────────────────────────────────────────────────
    constructor(string memory uriBase_, address initialOwner)
        Ownable(initialOwner)
    {
        _uriBase = uriBase_;
    }

    // ════════════════════════════════════════════════════════════════════════
    //                       Researcher / Admin actions
    // ════════════════════════════════════════════════════════════════════════

    /**
     * @notice Mint a new clinical-trial IP-NFT and open it for fractional funding.
     * @dev    The full fractional supply is minted to the contract itself and
     *         released to investors as they purchase shares; this lets the
     *         contract enforce the price-per-share invariant atomically.
     */
    function mintTrial(
        string calldata title,
        string calldata therapeuticArea,
        Phase phase,
        string calldata metadataURI,
        uint256 totalShares,
        uint256 pricePerShare,
        string[] calldata milestoneDescriptions,
        uint256[] calldata milestoneFundsBps
    ) external returns (uint256 tokenId) {
        if (uint8(phase) > uint8(Phase.PhaseIV)) revert InvalidPhase();
        if (totalShares == 0 || pricePerShare == 0) revert InvalidConfiguration();
        if (bytes(title).length == 0 || bytes(metadataURI).length == 0) {
            revert InvalidConfiguration();
        }

        uint256 mLen = milestoneDescriptions.length;
        if (mLen == 0 || mLen > MAX_MILESTONES) revert InvalidMilestoneSchedule();
        if (mLen != milestoneFundsBps.length) revert InvalidMilestoneSchedule();

        uint256 totalBps;
        for (uint256 i; i < mLen; ++i) {
            if (milestoneFundsBps[i] == 0) revert InvalidMilestoneSchedule();
            if (bytes(milestoneDescriptions[i]).length == 0) revert InvalidMilestoneSchedule();
            totalBps += milestoneFundsBps[i];
        }
        if (totalBps != BPS_DENOMINATOR) revert InvalidMilestoneSchedule();

        tokenId = nextTokenId++;
        uint256 fundingGoal = totalShares * pricePerShare;

        _trials[tokenId] = Trial({
            researcher: msg.sender,
            title: title,
            therapeuticArea: therapeuticArea,
            phase: phase,
            metadataURI: metadataURI,
            totalShares: totalShares,
            sharesSold: 0,
            pricePerShare: pricePerShare,
            fundingGoal: fundingGoal,
            escrow: 0,
            released: 0,
            status: TrialStatus.Funding,
            createdAt: uint64(block.timestamp),
            fundedAt: 0,
            verifierSignatures: 0
        });

        for (uint256 i; i < mLen; ++i) {
            _milestones[tokenId].push(
                Milestone({
                    description: milestoneDescriptions[i],
                    fundsBps: milestoneFundsBps[i],
                    released: false,
                    releasedAt: 0,
                    evidenceHash: bytes32(0)
                })
            );
        }

        // mint full fractional supply to the contract; transferred on purchase.
        _mint(address(this), tokenId, totalShares, "");

        emit TrialMinted(
            tokenId,
            msg.sender,
            title,
            phase,
            totalShares,
            pricePerShare,
            fundingGoal
        );
    }

    /**
     * @notice Owner curates the verifier-lab whitelist used for peer review.
     */
    function setVerifierLab(address lab, bool approved) external onlyOwner {
        if (lab == address(0)) revert ZeroAddress();
        isVerifierLab[lab] = approved;
        emit VerifierLabUpdated(lab, approved);
    }

    /**
     * @notice Researcher (or owner) cancels an under-funded trial; investors
     *         become eligible for pro-rata refunds against their unspent escrow.
     *         Already-released milestone funds are NOT refundable (research is
     *         underway).
     */
    function cancelTrial(uint256 tokenId) external nonReentrant {
        Trial storage t = _trials[tokenId];
        if (t.researcher == address(0)) revert TrialNotFound();
        if (msg.sender != t.researcher && msg.sender != owner()) revert NotResearcher();
        if (t.status == TrialStatus.Completed || t.status == TrialStatus.Cancelled) {
            revert NotCancellable();
        }

        t.status = TrialStatus.Cancelled;
        emit TrialCancelled(tokenId, t.escrow);
        // Note: refundsOwed is populated lazily on claim via balanceOf(investor).
    }

    // ════════════════════════════════════════════════════════════════════════
    //                              Investor actions
    // ════════════════════════════════════════════════════════════════════════

    /**
     * @notice Purchase fractional shares of a trial. Payment is held in escrow
     *         and only released to the researcher as milestones complete.
     */
    function buyShares(uint256 tokenId, uint256 shareAmount)
        external
        payable
        nonReentrant
    {
        Trial storage t = _trials[tokenId];
        if (t.researcher == address(0)) revert TrialNotFound();
        if (t.status != TrialStatus.Funding) revert TrialNotFunding();
        if (shareAmount == 0) revert InvalidConfiguration();

        uint256 remaining = t.totalShares - t.sharesSold;
        if (shareAmount > remaining) revert InsufficientShares();

        uint256 cost = shareAmount * t.pricePerShare;
        if (msg.value != cost) revert IncorrectPayment();

        t.sharesSold += shareAmount;
        t.escrow += cost;

        // Record per-investor contribution for potential refunds.
        refundsOwed[tokenId][msg.sender] += cost;

        // Move fractional shares from contract to investor.
        _safeTransferFrom(address(this), msg.sender, tokenId, shareAmount, "");

        emit SharesPurchased(
            tokenId,
            msg.sender,
            shareAmount,
            cost,
            t.totalShares - t.sharesSold
        );

        if (t.sharesSold == t.totalShares) {
            t.status = TrialStatus.Active;
            t.fundedAt = uint64(block.timestamp);
            emit TrialFunded(tokenId, t.escrow, t.fundedAt);
        }
    }

    /**
     * @notice Investor claims a refund after a trial is cancelled. The refund
     *         is pro-rated against funds remaining in escrow (i.e. funds not
     *         yet released for completed milestones).
     */
    function claimRefund(uint256 tokenId) external nonReentrant {
        Trial storage t = _trials[tokenId];
        if (t.status != TrialStatus.Cancelled) revert NotCancellable();

        uint256 contributed = refundsOwed[tokenId][msg.sender];
        if (contributed == 0) revert NothingToRefund();

        // Pro-rata share of remaining escrow:
        //   refund = contributed * escrow / totalContributed
        // totalContributed equals sharesSold * pricePerShare.
        uint256 totalContributed = t.sharesSold * t.pricePerShare;
        uint256 refund = (contributed * t.escrow) / totalContributed;

        refundsOwed[tokenId][msg.sender] = 0;

        if (refund > 0) {
            t.escrow -= refund;
            (bool ok, ) = msg.sender.call{value: refund}("");
            if (!ok) revert TransferFailed();
        }

        emit RefundClaimed(tokenId, msg.sender, refund);
    }

    // ════════════════════════════════════════════════════════════════════════
    //                          Milestones & data anchoring
    // ════════════════════════════════════════════════════════════════════════

    /**
     * @notice Researcher submits proof that a milestone is complete; escrowed
     *         funds for that milestone are released to them.
     * @param  evidenceHash SHA-256 hash of the off-chain evidence packet
     *                      (trial readouts, IRB approval, etc.).
     */
    function releaseMilestone(
        uint256 tokenId,
        uint256 milestoneIndex,
        bytes32 evidenceHash
    ) external nonReentrant {
        Trial storage t = _trials[tokenId];
        if (t.researcher == address(0)) revert TrialNotFound();
        if (msg.sender != t.researcher) revert NotResearcher();
        if (t.status != TrialStatus.Active) revert TrialNotActive();
        if (evidenceHash == bytes32(0)) revert EmptyHash();

        Milestone[] storage ms = _milestones[tokenId];
        if (milestoneIndex >= ms.length) revert MilestoneOutOfRange();

        Milestone storage m = ms[milestoneIndex];
        if (m.released) revert MilestoneAlreadyReleased();

        uint256 amount = (t.fundingGoal * m.fundsBps) / BPS_DENOMINATOR;

        // Defensive check: never release more than escrow holds.
        if (amount > t.escrow) amount = t.escrow;

        m.released = true;
        m.releasedAt = uint64(block.timestamp);
        m.evidenceHash = evidenceHash;

        t.escrow -= amount;
        t.released += amount;

        // Mark trial completed when all milestones released.
        bool allReleased = true;
        for (uint256 i; i < ms.length; ++i) {
            if (!ms[i].released) {
                allReleased = false;
                break;
            }
        }
        if (allReleased) t.status = TrialStatus.Completed;

        if (amount > 0) {
            (bool ok, ) = t.researcher.call{value: amount}("");
            if (!ok) revert TransferFailed();
        }

        emit MilestoneReleased(tokenId, milestoneIndex, amount, evidenceHash);
    }

    /**
     * @notice Anchor a SHA-256 hash of off-chain clinical / wearable data to
     *         the trial's audit trail. Anyone authorized by the researcher can
     *         submit; for simplicity here we restrict to the researcher.
     */
    function anchorClinicalData(uint256 tokenId, bytes32 dataHash) external {
        Trial storage t = _trials[tokenId];
        if (t.researcher == address(0)) revert TrialNotFound();
        if (msg.sender != t.researcher) revert NotResearcher();
        if (dataHash == bytes32(0)) revert EmptyHash();

        _dataAnchors[tokenId].push(dataHash);
        emit DataAnchored(tokenId, _dataAnchors[tokenId].length - 1, dataHash, msg.sender);
    }

    // ════════════════════════════════════════════════════════════════════════
    //                            Decentralized peer review
    // ════════════════════════════════════════════════════════════════════════

    /**
     * @notice Whitelisted verifier lab signs an IP-NFT after running validation
     *         tests. Each lab can sign at most once per trial. The signature
     *         count drives the trial's "Trust Score" off-chain.
     * @param  reviewHash SHA-256 of the validation report (included in event
     *                    log for permanent reference but not stored to save
     *                    gas; off-chain indexers should retain it).
     */
    function peerReview(uint256 tokenId, bytes32 reviewHash) external {
        Trial storage t = _trials[tokenId];
        if (t.researcher == address(0)) revert TrialNotFound();
        if (!isVerifierLab[msg.sender]) revert NotVerifierLab();
        if (hasSigned[tokenId][msg.sender]) revert AlreadySigned();
        if (reviewHash == bytes32(0)) revert EmptyHash();

        hasSigned[tokenId][msg.sender] = true;
        _signers[tokenId].push(msg.sender);
        unchecked {
            t.verifierSignatures += 1;
        }

        emit PeerReviewSigned(tokenId, msg.sender, t.verifierSignatures, reviewHash);
    }

    // ════════════════════════════════════════════════════════════════════════
    //                                  Views
    // ════════════════════════════════════════════════════════════════════════

    function getTrial(uint256 tokenId) external view returns (Trial memory) {
        Trial memory t = _trials[tokenId];
        if (t.researcher == address(0)) revert TrialNotFound();
        return t;
    }

    function getMilestones(uint256 tokenId) external view returns (Milestone[] memory) {
        if (_trials[tokenId].researcher == address(0)) revert TrialNotFound();
        return _milestones[tokenId];
    }

    function getDataAnchors(uint256 tokenId) external view returns (bytes32[] memory) {
        if (_trials[tokenId].researcher == address(0)) revert TrialNotFound();
        return _dataAnchors[tokenId];
    }

    function getSigners(uint256 tokenId) external view returns (address[] memory) {
        if (_trials[tokenId].researcher == address(0)) revert TrialNotFound();
        return _signers[tokenId];
    }

    /// @notice Funds released so far as a percentage in basis points.
    function fundingProgressBps(uint256 tokenId) external view returns (uint256) {
        Trial storage t = _trials[tokenId];
        if (t.researcher == address(0)) revert TrialNotFound();
        if (t.fundingGoal == 0) return 0;
        return ((t.sharesSold * t.pricePerShare) * BPS_DENOMINATOR) / t.fundingGoal;
    }

    /// @notice Trust score in [0, 100] derived from peer-review signatures.
    ///         Saturates at 10 distinct verifier signatures.
    function trustScore(uint256 tokenId) external view returns (uint256) {
        Trial storage t = _trials[tokenId];
        if (t.researcher == address(0)) revert TrialNotFound();
        uint256 sigs = t.verifierSignatures;
        if (sigs >= 10) return 100;
        return sigs * 10;
    }

    // ── ERC-1155 receiver hook so the registry can hold its own freshly-minted
    //    fractional supply before investors purchase. ─────────────────────────
    function onERC1155Received(
        address,
        address,
        uint256,
        uint256,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address,
        address,
        uint256[] calldata,
        uint256[] calldata,
        bytes calldata
    ) external pure returns (bytes4) {
        return IERC1155Receiver.onERC1155BatchReceived.selector;
    }
}
