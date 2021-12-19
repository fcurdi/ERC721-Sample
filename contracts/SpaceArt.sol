// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SpaceArt is IERC165, IERC721, IERC721Metadata, IERC721Enumerable {
    mapping(address => uint256) private balances;

    mapping(uint256 => address) private owners;

    mapping(address => mapping(address => bool)) private operators;

    mapping(uint256 => address) private approvedAddresses;

    mapping(bytes4 => bool) private supportedInterfaces;

    mapping(uint256 => string) private tokenUris;

    using Counters for Counters.Counter;
    Counters.Counter private tokenIdCounter;

    // For enumeration
    uint256[] private tokenIds;
    mapping(uint256 => uint256) private tokenIdsIndexes;
    mapping(address => uint256[]) private tokenIdsByOwner;
    mapping(uint256 => uint256) private tokenIdsByOwnerIndexes;
    //

    uint256 private constant MAX_TOKENS = 7;
    address private constant ZERO_ADDRESS = address(0);

    constructor() {
        declareSupportedInterfaces();
    }

    function mint(string calldata tokenUri) external {
        uint256 tokenId = tokenIdCounter.current();
        require(tokenId < MAX_TOKENS, "All tokens already minted");
        address owner = msg.sender;

        balances[owner]++;
        owners[tokenId] = owner;
        tokenUris[tokenId] = tokenUri;

        addEnumerationFor(tokenId);
        addEnumerationFor(tokenId, owner);

        tokenIdCounter.increment();
        emit Transfer(ZERO_ADDRESS, owner, tokenId);
    }

    function burn(uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(
            canManageToken(tokenId, owner, msg.sender),
            "Not authorized to burn NFT"
        );

        balances[owner]--;
        delete owners[tokenId];
        delete tokenUris[tokenId];
        _approve(tokenId, owner, ZERO_ADDRESS);

        removeEnumerationFor(tokenId);
        removeEnumerationFor(tokenId, owner);

        emit Transfer(owner, ZERO_ADDRESS, tokenId);
    }

    function name() external pure returns (string memory) {
        return "Space Art";
    }

    function symbol() external pure returns (string memory) {
        return "SART";
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        validate(tokenId);
        return tokenUris[tokenId];
    }

    function balanceOf(address owner) public view returns (uint256 balance) {
        require(owner != ZERO_ADDRESS, "Invalid address");
        return balances[owner];
    }

    function ownerOf(uint256 tokenId) public view returns (address owner) {
        owner = owners[tokenId];
        require(owner != ZERO_ADDRESS, "NFT is not valid");
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external {
        _safeTransferFrom(from, to, tokenId, data);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external {
        _safeTransferFrom(from, to, tokenId, "");
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public {
        address owner = ownerOf(tokenId);
        require(
            canManageToken(tokenId, owner, msg.sender),
            "Sender is not authorized to make a transfer"
        );
        require(from == owner, "From address must be the NFT owner");
        require(to != ZERO_ADDRESS, "Invalid address");

        owners[tokenId] = to;
        balances[from]--;
        balances[to]++;

        _approve(tokenId, owner, ZERO_ADDRESS);

        removeEnumerationFor(tokenId, owner);
        addEnumerationFor(tokenId, to);

        emit Transfer(from, to, tokenId);
    }

    function approve(address to, uint256 tokenId) external {
        address owner = ownerOf(tokenId);
        require(
            msg.sender == owner || isApprovedForAll(owner, msg.sender),
            "Sender is not owner nor operator"
        );
        _approve(tokenId, owner, to);
    }

    function setApprovalForAll(address operator, bool _approved) external {
        require(operator != ZERO_ADDRESS, "Invalid address"); // not in the 721 spec
        operators[msg.sender][operator] = _approved;
        emit ApprovalForAll(msg.sender, operator, _approved);
    }

    function getApproved(uint256 tokenId)
        public
        view
        returns (address operator)
    {
        validate(tokenId);
        operator = approvedAddresses[tokenId];
    }

    function isApprovedForAll(address owner, address operator)
        public
        view
        returns (bool)
    {
        return operators[owner][operator];
    }

    function supportsInterface(bytes4 interfaceId)
        external
        view
        returns (bool)
    {
        return supportedInterfaces[interfaceId];
    }

    function totalSupply() public view returns (uint256) {
        return tokenIds.length;
    }

    function tokenByIndex(uint256 index) external view returns (uint256) {
        require(index < totalSupply(), "Invalid index");
        return tokenIds[index];
    }

    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256 tokenId)
    {
        require(index < balanceOf(owner), "Invalid index for owner");
        return tokenIdsByOwner[owner][index];
    }

    function _safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private {
        transferFrom(from, to, tokenId);
        if (isSmartContract(to)) {
            IERC721Receiver receiver = IERC721Receiver(to);
            bytes4 result = receiver.onERC721Received(
                msg.sender,
                from,
                tokenId,
                data
            );
            require(
                result == receiver.onERC721Received.selector,
                "To address rejected the transfer"
            );
        }
    }

    function isSmartContract(address addr) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    function validate(uint256 tokenId) private view {
        ownerOf(tokenId);
    }

    function _approve(
        uint256 tokenId,
        address owner,
        address to
    ) private {
        approvedAddresses[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function canManageToken(
        uint256 tokenId,
        address owner,
        address addr
    ) private view returns (bool) {
        return
            addr == owner ||
            isApprovedForAll(owner, addr) ||
            getApproved(tokenId) == addr;
    }

    function declareSupportedInterfaces() private {
        supportedInterfaces[type(IERC165).interfaceId] = true;
        supportedInterfaces[type(IERC721).interfaceId] = true;
        supportedInterfaces[type(IERC721Metadata).interfaceId] = true;
        supportedInterfaces[type(IERC721Enumerable).interfaceId] = true;

        // Invalid acording to IERC165
        supportedInterfaces[0xffffffff] = false;
    }

    function addEnumerationFor(uint256 tokenId) private {
        tokenIdsIndexes[tokenId] = tokenIds.length;
        tokenIds.push(tokenId);
    }

    function addEnumerationFor(uint256 tokenId, address owner) private {
        uint256[] storage ids = tokenIdsByOwner[owner];
        tokenIdsByOwnerIndexes[tokenId] = ids.length;
        ids.push(tokenId);
    }

    function removeEnumerationFor(uint256 tokenId) private {
        removeEnumeration(tokenId, tokenIds, tokenIdsIndexes);
    }

    function removeEnumerationFor(uint256 tokenId, address owner) private {
        removeEnumeration(
            tokenId,
            tokenIdsByOwner[owner],
            tokenIdsByOwnerIndexes
        );
    }

    // Removes id from array by swapping it for the last element and removing its index
    function removeEnumeration(
        uint256 id,
        uint256[] storage array,
        mapping(uint256 => uint256) storage indexes
    ) private {
        uint256 index = indexes[id];
        uint256 swappedId = array[array.length - 1];
        array[index] = swappedId;
        array.pop();
        delete indexes[id];
        indexes[swappedId] = index;
    }
}
