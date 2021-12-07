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

    uint256[] private tokenIds;
    mapping(address => uint256[]) private tokenIdsByOwner;

    using Counters for Counters.Counter;
    Counters.Counter private tokenIdCounter;
    uint256 private constant MAX_TOKENS = 7;

    constructor() {
        declareSupportedInterfaces();
    }

    function create(string calldata tokenUri) external {
        uint256 tokenId = tokenIdCounter.current();
        require(tokenId < MAX_TOKENS, "All tokens already created");
        address tokenOwner = msg.sender;
        balances[tokenOwner]++;
        owners[tokenId] = tokenOwner;
        tokenUris[tokenId] = tokenUri;
        tokenIds.push(tokenId);
        addIndexedTokenId(tokenId, tokenOwner);
        tokenIdCounter.increment();
        emit Transfer(address(0), tokenOwner, tokenId);
    }

    function destroy(uint256 tokenId) external {
        address tokenOwner = _ownerOf(tokenId);
        require(tokenOwner == msg.sender, "Only owner can destroy its NFT");
        balances[tokenOwner]--;
        owners[tokenId] = address(0);
        approvedAddresses[tokenId] = address(0);
        tokenUris[tokenId] = "";
        removeIdFromArray(tokenId, tokenIds);
        removeIndexedTokenIdByOwner(tokenId, tokenOwner);
        emit Transfer(tokenOwner, address(0), tokenId);
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

    function balanceOf(address owner) external view returns (uint256 balance) {
        return _balanceOf(owner);
    }

    function ownerOf(uint256 tokenId) external view returns (address owner) {
        owner = _ownerOf(tokenId);
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
        address owner = _ownerOf(tokenId);
        require(
            msg.sender == owner ||
                isApprovedForAll(owner, msg.sender) ||
                getApproved(tokenId) == msg.sender,
            "Sender is not authorized to make a transfer"
        );
        require(from == owner, "From address must be the NFT owner");
        require(to != address(0), "Invalid address");
        owners[tokenId] = to;
        balances[from]--;
        balances[to]++;
        approvedAddresses[tokenId] = address(0);
        emit Approval(owner, address(0), tokenId);
        removeIndexedTokenIdByOwner(tokenId, owner);
        addIndexedTokenId(tokenId, to);
        emit Transfer(from, to, tokenId);
    }

    function approve(address to, uint256 tokenId) external {
        address owner = _ownerOf(tokenId);
        require(
            msg.sender == owner || isApprovedForAll(owner, msg.sender),
            "Sender is not owner nor operator"
        );
        approvedAddresses[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool _approved) external {
        require(operator != address(0), "Invalid address"); // not in the 721 spec
        operators[msg.sender][operator] = _approved;
        emit ApprovalForAll(msg.sender, operator, _approved);
    }

    function getApproved(uint256 tokenId)
        public
        view
        returns (address operator)
    {
        validate(tokenId);
        operator =  approvedAddresses[tokenId];
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

    function totalSupply() external view returns (uint256) {
        return _totalSupply();
    }

    function tokenByIndex(uint256 index) external view returns (uint256) {
        require(index < _totalSupply(), "Invalid index");
        return tokenIds[index];
    }

    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256 tokenId)
    {
        require(index < _balanceOf(owner), "Invalid index for owner");
        return tokenIdsByOwner[owner][index];
    }

    function _balanceOf(address owner) private view returns (uint256) {
        require(owner != address(0), "Invalid address");
        return balances[owner];
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

    function _ownerOf(uint256 tokenId) private view returns (address) {
        address owner = owners[tokenId];
        require(owner != address(0), "NFT is not valid");
        return owner;
    }

    function validate(uint256 tokenId) private view {
        _ownerOf(tokenId);
    }

    function declareSupportedInterfaces() private {
        supportedInterfaces[type(IERC165).interfaceId] = true;
        supportedInterfaces[type(IERC721).interfaceId] = true;
        supportedInterfaces[type(IERC721Metadata).interfaceId] = true;
        supportedInterfaces[type(IERC721Enumerable).interfaceId] = true;

        // Invalid acording to IERC165
        supportedInterfaces[0xffffffff] = false;
    }

    function _totalSupply() private view returns (uint256) {
        return tokenIds.length;
    }

    function addIndexedTokenId(uint256 tokenId, address owner) private {
        tokenIdsByOwner[owner].push(tokenId);
    }

    function removeIndexedTokenIdByOwner(uint256 tokenId, address owner)
        private
    {
        removeIdFromArray(tokenId, tokenIdsByOwner[owner]);
    }

    function removeIdFromArray(uint256 id, uint256[] storage ids) private {
        uint256 index;
        for (uint256 i = 0; i < ids.length; i++) {
            if (id == ids[i]) {
                index = i;
            }
        }
        ids[index] = ids[ids.length - 1];
        ids.pop();
    }
}
