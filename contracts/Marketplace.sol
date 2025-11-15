// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../erc-8004-contracts/contracts/IdentityRegistry.sol";

/**
 * @title Marketplace
 * @notice ERC-8004 compliant agent-to-agent marketplace
 * @dev Agent trading system deployed on Hedera Testnet
 *
 * Core Features:
 * - Listing: Agents list products/services for sale
 * - Inquiry: Agents express purchase intent
 * - Reservation: Seller selects buyer to finalize transaction
 * - Completion: Transaction completed
 * - Cancellation: Listing withdrawal or no-show handling
 *
 * ERC-8004 Integration:
 * - agentId is a uint256 tokenId managed by ERC-8004 IdentityRegistry
 * - Agent owner (EOA) is retrieved via IdentityRegistry.ownerOf(agentId)
 * - msg.sender must match IdentityRegistry.ownerOf(agentId)
 *
 * State Transitions:
 *   OPEN ──selectReservation()──→ RESERVED ──completeListing()──→ COMPLETED
 *     │                              │    ↑
 *     │                              └────┘ revokeReservation()
 *     │                              │
 *     └──cancelListing()──→ CANCELLED ←──┘
 */
contract Marketplace {
    // ===== ERC-8004 Integration =====

    IdentityRegistry public immutable identityRegistry;


    // ===== Structs =====

    /**
     * @notice Listing information
     * @dev sellerAgentId is the ERC-8004 agentId (uint256 tokenId)
     */
    struct Listing {
        uint256 listingId;        // Listing ID
        uint256 sellerAgentId;    // Seller agent ID (ERC-8004 agentId)
        string title;             // Title
        string description;       // Description
        uint256 basePrice;        // Minimum price (unit: tinybar). 0 = not specified/no minimum
        uint256 expectedPrice;    // Expected price (unit: tinybar). 0 = not specified/no expectation
        ListingStatus status;     // Status (OPEN/RESERVED/COMPLETED/CANCELLED)
        uint256 createdAt;        // Creation timestamp
    }

    /**
     * @notice Inquiry information
     * @dev buyerAgentId is the ERC-8004 agentId (uint256 tokenId)
     *
     * AP2-aligned Claim-based Model:
     * - Buyer submits CLAIMS (not verified attributes)
     * - Seller verifies off-chain independently
     * - Marketplace records both claims and seller's decision
     */
    struct Inquiry {
        uint256 inquiryId;        // Inquiry ID
        uint256 listingId;        // Target listing ID
        uint256 buyerAgentId;     // Buyer agent ID (ERC-8004 agentId)
        uint256 offerPrice;       // Offered price (unit: tinybar)
        string message;           // Message
        InquiryStatus status;     // Status (PENDING/ACCEPTED)
        uint256 createdAt;        // Creation timestamp

        // AP2-aligned fields: Buyer's CLAIMS (not verified)
        bytes32 mandateVcHash;           // Mandate VC identifier (on HCS)
        bytes32 claimedAttributesHash;   // Buyer's claimed attributes (maxSpend, expiresAt, etc.)
        bytes32 claimedCapabilitiesHash; // Buyer's claimed payment capabilities
        bytes32 reviewHash;              // Seller's verification proof (set when ACCEPTED)
    }

    /**
     * @notice Listing status
     */
    enum ListingStatus {
        OPEN,       // Open for inquiries
        RESERVED,   // Transaction finalized
        COMPLETED,  // Completed
        CANCELLED   // Cancelled
    }

    /**
     * @notice Inquiry status
     */
    enum InquiryStatus {
        PENDING,    // Pending
        ACCEPTED    // Accepted
    }

    // ===== State Variables =====

    uint256 private _nextListingId = 1;
    uint256 private _nextInquiryId = 1;

    mapping(uint256 => Listing) public listings;
    mapping(uint256 => Inquiry) public inquiries;

    // Inquiry list per listing
    mapping(uint256 => uint256[]) public listingInquiries;

    // Finalized inquiry ID per listing
    mapping(uint256 => uint256) public listingReservation;

    // TODO: Add HBAR escrow system (mapping escrowBalance, deposit/refund logic)

    // ===== Events =====

    /**
     * @notice Emitted when a listing is created
     * @param listingId Listing ID
     * @param sellerAgentId Seller agent ID (ERC-8004 agentId)
     * @param title Title
     * @param basePrice Minimum price (tinybar)
     * @param expectedPrice Expected price (tinybar)
     * @param timestamp Creation timestamp
     */
    event ListingCreated(
        uint256 indexed listingId,
        uint256 indexed sellerAgentId,
        string title,
        uint256 basePrice,
        uint256 expectedPrice,
        uint256 timestamp
    );

    /**
     * @notice Emitted when an inquiry is submitted
     * @param inquiryId Inquiry ID
     * @param listingId Target listing ID
     * @param buyerAgentId Buyer agent ID (ERC-8004 agentId)
     * @param offerPrice Offered price (tinybar)
     * @param message Message
     * @param mandateVcHash Mandate VC hash (HCS identifier)
     * @param claimedAttributesHash Hash of attributes claimed by buyer
     * @param claimedCapabilitiesHash Hash of payment capabilities claimed by buyer
     * @param timestamp Submission timestamp
     */
    event InquirySubmitted(
        uint256 indexed inquiryId,
        uint256 indexed listingId,
        uint256 indexed buyerAgentId,
        uint256 offerPrice,
        string message,
        bytes32 mandateVcHash,
        bytes32 claimedAttributesHash,
        bytes32 claimedCapabilitiesHash,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a reservation is granted
     * @param listingId Listing ID
     * @param inquiryId Selected inquiry ID
     * @param buyerAgentId Buyer agent ID (ERC-8004 agentId)
     * @param sellerAgentId Seller agent ID (ERC-8004 agentId)
     * @param reasonCode Selection reason code (e.g., "highest_offer", "seller_choice")
     * @param reviewHash Seller's independent verification result (hash of off-chain verification report).
     *                   Seller claims to have verified Buyer's claimedAttributes and Mandate VC at this point.
     * @param timestamp Grant timestamp
     */
    event ReservationGranted(
        uint256 indexed listingId,
        uint256 indexed inquiryId,
        uint256 buyerAgentId,
        uint256 sellerAgentId,
        string reasonCode,
        bytes32 reviewHash,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a listing is completed
     * @param listingId Listing ID
     * @param inquiryId Finalized inquiry ID
     * @param timestamp Completion timestamp
     */
    event ListingCompleted(
        uint256 indexed listingId,
        uint256 indexed inquiryId,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a listing is cancelled
     * @param listingId Listing ID
     * @param inquiryId Reserved inquiry ID (0 if cancelled from OPEN state)
     * @param sellerAgentId Seller agent ID (ERC-8004 agentId)
     * @param timestamp Cancellation timestamp
     */
    event ListingCancelled(
        uint256 indexed listingId,
        uint256 inquiryId,
        uint256 indexed sellerAgentId,
        uint256 timestamp
    );

    /**
     * @notice Emitted when a reservation is revoked (no-show handling)
     * @param listingId Listing ID
     * @param inquiryId Revoked inquiry ID
     * @param sellerAgentId Seller agent ID (ERC-8004 agentId)
     * @param reasonCode Revocation reason (e.g., "buyer_no_show", "timeout")
     * @param timestamp Revocation timestamp
     */
    event ReservationRevoked(
        uint256 indexed listingId,
        uint256 indexed inquiryId,
        uint256 indexed sellerAgentId,
        string reasonCode,
        uint256 timestamp
    );

    // ===== Constructor =====

    /**
     * @notice Marketplace contract constructor
     * @param _identityRegistry ERC-8004 IdentityRegistry address
     */
    constructor(address _identityRegistry) {
        identityRegistry = IdentityRegistry(_identityRegistry);
    }

    // ===== Modifiers =====

    /**
     * @notice Verify agentId ownership
     * @param agentId The agentId to verify
     */
    modifier onlyAgentOwner(uint256 agentId) {
        require(
            identityRegistry.ownerOf(agentId) == msg.sender,
            "Not agent owner"
        );
        _;
    }

    // ===== Core Functions =====

    /**
     * @notice Create a new listing
     * @param sellerAgentId Seller agent ID (ERC-8004 agentId)
     * @param title Title
     * @param description Description
     * @param basePrice Minimum price (unit: tinybar). 0 = not specified
     * @param expectedPrice Expected price (unit: tinybar). 0 = not specified
     * @return listingId Created listing ID
     *
     * @dev CRITICAL: Prices are in tinybar units
     *      Example: 1 HBAR = 100,000,000 tinybar (10^8)
     *      basePrice = 0, expectedPrice = 0 represents "free transfer/negotiation-based"
     */
    function createListing(
        uint256 sellerAgentId,
        string memory title,
        string memory description,
        uint256 basePrice,
        uint256 expectedPrice
    ) external onlyAgentOwner(sellerAgentId) returns (uint256) {
        uint256 listingId = _nextListingId++;

        listings[listingId] = Listing({
            listingId: listingId,
            sellerAgentId: sellerAgentId,
            title: title,
            description: description,
            basePrice: basePrice,
            expectedPrice: expectedPrice,
            status: ListingStatus.OPEN,
            createdAt: block.timestamp
        });

        emit ListingCreated(
            listingId,
            sellerAgentId,
            title,
            basePrice,
            expectedPrice,
            block.timestamp
        );

        return listingId;
    }

    /**
     * @notice Submit an inquiry to a listing
     * @param buyerAgentId Buyer agent ID (ERC-8004 agentId)
     * @param listingId Target listing ID
     * @param offerPrice Offered price (unit: tinybar)
     * @param message Message (optional)
     * @param mandateVcHash Mandate VC hash (HCS identifier)
     * @param claimedAttributesHash Hash of attributes claimed by buyer
     * @param claimedCapabilitiesHash Hash of payment capabilities claimed by buyer
     * @return inquiryId Created inquiry ID
     *
     * @dev Seller cannot inquire their own listing
     *      Reverts if listing is not in OPEN state
     *
     *      AP2-aligned: Buyer submits CLAIMS, not verified attributes.
     *      Seller will verify off-chain independently (see selectReservation).
     */
    // TODO: Make payable, deposit msg.value to escrow, verify amount matches offerPrice
    function createInquiry(
        uint256 buyerAgentId,
        uint256 listingId,
        uint256 offerPrice,
        string memory message,
        bytes32 mandateVcHash,
        bytes32 claimedAttributesHash,
        bytes32 claimedCapabilitiesHash
    ) external /* payable */ onlyAgentOwner(buyerAgentId) returns (uint256) {
        require(listings[listingId].listingId != 0, "Listing does not exist");
        require(listings[listingId].status == ListingStatus.OPEN, "Listing not open");
        require(buyerAgentId != listings[listingId].sellerAgentId, "Seller cannot inquire own listing");

        uint256 inquiryId = _nextInquiryId++;

        inquiries[inquiryId] = Inquiry({
            inquiryId: inquiryId,
            listingId: listingId,
            buyerAgentId: buyerAgentId,
            offerPrice: offerPrice,
            message: message,
            status: InquiryStatus.PENDING,
            createdAt: block.timestamp,
            mandateVcHash: mandateVcHash,
            claimedAttributesHash: claimedAttributesHash,
            claimedCapabilitiesHash: claimedCapabilitiesHash,
            reviewHash: bytes32(0) // Set when ACCEPTED by selectReservation
        });

        listingInquiries[listingId].push(inquiryId);

        emit InquirySubmitted(
            inquiryId,
            listingId,
            buyerAgentId,
            offerPrice,
            message,
            mandateVcHash,
            claimedAttributesHash,
            claimedCapabilitiesHash,
            block.timestamp
        );

        return inquiryId;
    }

    /**
     * @notice Grant reservation (seller selects buyer)
     * @param sellerAgentId Seller agent ID (caller verification)
     * @param listingId Target listing ID
     * @param inquiryId Inquiry ID to select
     * @param reasonCode Selection reason (e.g., "highest_offer", "seller_choice")
     * @param reviewHash Hash of seller's VC verification result (verification proof)
     *
     * @dev Only seller can execute
     *      Reverts if listing is not in OPEN state
     *      After selection, Listing.status becomes RESERVED
     *      Selected Inquiry.status becomes ACCEPTED
     *
     *      AP2-aligned: By calling this function, Seller implicitly confirms
     *      they have verified the Mandate VC off-chain. reviewHash provides
     *      audit trail of Seller's independent verification.
     */
    function selectReservation(
        uint256 sellerAgentId,
        uint256 listingId,
        uint256 inquiryId,
        string memory reasonCode,
        bytes32 reviewHash
    ) external onlyAgentOwner(sellerAgentId) {
        require(listings[listingId].listingId != 0, "Listing does not exist");
        require(listings[listingId].sellerAgentId == sellerAgentId, "Only seller can select");
        require(listings[listingId].status == ListingStatus.OPEN, "Listing not open");

        require(inquiries[inquiryId].inquiryId != 0, "Inquiry does not exist");
        require(inquiries[inquiryId].listingId == listingId, "Inquiry not for this listing");
        require(inquiries[inquiryId].status == InquiryStatus.PENDING, "Inquiry not pending");

        // Update listing status
        listings[listingId].status = ListingStatus.RESERVED;

        // Update inquiry status
        inquiries[inquiryId].status = InquiryStatus.ACCEPTED;
        inquiries[inquiryId].reviewHash = reviewHash;

        // Record reservation
        listingReservation[listingId] = inquiryId;

        emit ReservationGranted(
            listingId,
            inquiryId,
            inquiries[inquiryId].buyerAgentId,
            sellerAgentId,
            reasonCode,
            reviewHash,
            block.timestamp
        );
    }

    /**
     * @notice Complete listing (called after payment)
     * @param sellerAgentId Seller agent ID (caller verification)
     * @param listingId Target listing ID
     *
     * @dev Only seller can execute
     *      Can only complete from RESERVED state
     *      Transitions to COMPLETED state after completion
     */
    function completeListing(uint256 sellerAgentId, uint256 listingId) external onlyAgentOwner(sellerAgentId) {
        require(listings[listingId].listingId != 0, "Listing does not exist");
        require(listings[listingId].sellerAgentId == sellerAgentId, "Only seller");
        require(listings[listingId].status == ListingStatus.RESERVED, "Not reserved");

        uint256 inquiryId = listingReservation[listingId];

        // TODO: Transfer escrowed HBAR to seller (clear escrow first for reentrancy protection)

        // Transition to completed state
        listings[listingId].status = ListingStatus.COMPLETED;

        emit ListingCompleted(listingId, inquiryId, block.timestamp);
    }

    /**
     * @notice Cancel listing (listing withdrawal or no-show handling)
     * @param sellerAgentId Seller agent ID (caller verification)
     * @param listingId Target listing ID
     *
     * @dev Only seller can execute
     *      Can cancel from OPEN or RESERVED state
     *      Cannot cancel from COMPLETED state
     */
    function cancelListing(uint256 sellerAgentId, uint256 listingId) external onlyAgentOwner(sellerAgentId) {
        require(listings[listingId].listingId != 0, "Listing does not exist");
        require(listings[listingId].sellerAgentId == sellerAgentId, "Only seller");
        require(
            listings[listingId].status == ListingStatus.OPEN ||
            listings[listingId].status == ListingStatus.RESERVED,
            "Cannot cancel"
        );

        // Get reserved inquiryId if in RESERVED state
        uint256 inquiryId = 0;
        if (listings[listingId].status == ListingStatus.RESERVED) {
            inquiryId = listingReservation[listingId];
            // TODO: Refund escrowed HBAR to buyer if exists
        }

        // Transition to cancelled state
        listings[listingId].status = ListingStatus.CANCELLED;

        emit ListingCancelled(listingId, inquiryId, sellerAgentId, block.timestamp);
    }

    /**
     * @notice Revoke reservation (RESERVED → OPEN)
     * @param sellerAgentId Seller agent ID (caller verification)
     * @param listingId Target listing ID
     * @param reasonCode Revocation reason (e.g., "buyer_no_show", "timeout", "seller_choice")
     *
     * @dev Only seller can execute
     *      Can only revoke from RESERVED state
     *      Returns to OPEN state after revocation, allowing selection of next buyer
     *      Reserved Inquiry becomes tombstone (remains ACCEPTED)
     */
    function revokeReservation(
        uint256 sellerAgentId,
        uint256 listingId,
        string memory reasonCode
    ) external onlyAgentOwner(sellerAgentId) {
        require(listings[listingId].listingId != 0, "Listing does not exist");
        require(listings[listingId].sellerAgentId == sellerAgentId, "Only seller");
        require(listings[listingId].status == ListingStatus.RESERVED, "Not reserved");

        uint256 reservedInquiryId = listingReservation[listingId];
        require(reservedInquiryId != 0, "No reservation");

        // TODO: Refund escrowed HBAR to buyer if exists

        // Return to OPEN state
        listings[listingId].status = ListingStatus.OPEN;

        // Clear reservation
        listingReservation[listingId] = 0;

        emit ReservationRevoked(
            listingId,
            reservedInquiryId,
            sellerAgentId,
            reasonCode,
            block.timestamp
        );
    }

    // ===== View Functions =====

    /**
     * @notice Get all inquiry IDs for a listing
     * @param listingId Target listing ID
     * @return Array of inquiry IDs
     */
    function getListingInquiries(uint256 listingId) external view returns (uint256[] memory) {
        return listingInquiries[listingId];
    }

    /**
     * @notice Get finalized inquiry ID for a listing
     * @param listingId Target listing ID
     * @return Inquiry ID (0 if not finalized)
     */
    function getReservation(uint256 listingId) external view returns (uint256) {
        return listingReservation[listingId];
    }

    /**
     * @notice Get listing details
     * @param listingId Target listing ID
     * @return Listing information
     */
    function getListing(uint256 listingId) external view returns (Listing memory) {
        return listings[listingId];
    }

    /**
     * @notice Get inquiry details
     * @param inquiryId Target inquiry ID
     * @return Inquiry information
     */
    function getInquiry(uint256 inquiryId) external view returns (Inquiry memory) {
        return inquiries[inquiryId];
    }

    /**
     * @notice Get complete listing state in a single call
     * @param listingId Target listing ID
     * @return listing Listing information
     * @return inquiryIds All inquiry ID array for this listing
     * @return reservedInquiryId Reserved inquiry ID (0 if no reservation)
     *
     * @dev Convenience function for frontend/demo scripts
     *      Retrieves all listing information in a single call
     *      Reduces RPC call count (3 calls → 1 call)
     */
    function getListingState(uint256 listingId)
        external
        view
        returns (
            Listing memory listing,
            uint256[] memory inquiryIds,
            uint256 reservedInquiryId
        )
    {
        listing = listings[listingId];
        inquiryIds = listingInquiries[listingId];
        reservedInquiryId = listingReservation[listingId];
    }
}
