// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract SpaceArt is IERC165, IERC721, IERC721Metadata, IERC721Enumerable {
    mapping(address => uint256) private _balances;

    /// The zero address indicates an invalid NFT.
    mapping(uint256 => address) private _owners;

    mapping(address => mapping(address => bool)) private _operators;

    /// The zero address indicates there is no approved address.
    mapping(uint256 => address) private _approvedAddresses;

    mapping(bytes4 => bool) private _supportedInterfaces;

    mapping(uint256 => string) private _tokenUris;

    uint256[] private _indexedTokenIds;
    mapping(address => uint256[]) private _indexedTokenIdsByOwner;

    uint256 private _nextTokenId;
    uint256 private constant _maxTokens = 7;
    uint256 private _validTokens;

    constructor() {
        _declareSupportedInterfaces();
    }

    function create(string calldata tokenUri) external {
        require(_nextTokenId < _maxTokens, "All tokens already created");
        address tokenOwner = msg.sender;
        uint256 tokenId = _nextTokenId;
        _balances[tokenOwner]++;
        _owners[tokenId] = tokenOwner;
        _tokenUris[tokenId] = tokenUri;
        _indexedTokenIds.push(tokenId);
        _addIndexedTokenId(tokenId, tokenOwner);
        _nextTokenId++;
        _validTokens++;
        emit Transfer(address(0), tokenOwner, tokenId);
    }

    function destroy(uint256 tokenId) external {
        address tokenOwner = _ownerOf(tokenId);
        require(tokenOwner == msg.sender, "Only owner can destroy its NFT");
        _balances[tokenOwner]--;
        _owners[tokenId] = address(0);
        _approvedAddresses[tokenId] = address(0);
        _tokenUris[tokenId] = "";
        _removeTokenIdFromArray(tokenId, _indexedTokenIds);
        _removeIndexedTokenIdByOwner(tokenId, tokenOwner);
        _validTokens--;
        emit Transfer(tokenOwner, address(0), tokenId);
    }

    function name() external pure returns (string memory) {
        return "Space Art";
    }

    function symbol() external pure returns (string memory) {
        return "SART";
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        _ownerOf(tokenId); // validate tokenId
        return _tokenUris[tokenId];
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
    ) external {
        _transfer(from, to, tokenId);
    }

    function approve(address to, uint256 tokenId) external {
        address owner = _ownerOf(tokenId);
        require(
            msg.sender == owner || _approvedOperator(owner, msg.sender),
            "Sender is not owner nor operator"
        );
        _approvedAddresses[tokenId] = to;
        emit Approval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool _approved) external {
        require(operator != address(0), "Invalid address"); // not in the 721 spec
        _operators[msg.sender][operator] = _approved;
        emit ApprovalForAll(msg.sender, operator, _approved);
    }

    function getApproved(uint256 tokenId)
        external
        view
        returns (address operator)
    {
        operator = _approvedAddressOf(tokenId);
    }

    function isApprovedForAll(address owner, address operator)
        external
        view
        returns (bool)
    {
        return _approvedOperator(owner, operator);
    }

    function supportsInterface(bytes4 interfaceId)
        external
        view
        returns (bool)
    {
        return _supportedInterfaces[interfaceId];
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply();
    }

    function tokenByIndex(uint256 index) external view returns (uint256) {
        require(index < _totalSupply(), "Invalid index");
        return _indexedTokenIds[index];
    }

    function tokenOfOwnerByIndex(address owner, uint256 index)
        external
        view
        returns (uint256 tokenId)
    {
        require(index < _balanceOf(owner), "Invalid index for owner");
        return _indexedTokenIdsByOwner[owner][index];
    }

    function _balanceOf(address owner) private view returns (uint256) {
        require(owner != address(0), "Invalid address");
        return _balances[owner];
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) private {
        address owner = _ownerOf(tokenId);
        require(
            msg.sender == owner ||
                _approvedOperator(owner, msg.sender) ||
                _approvedAddressOf(tokenId) == msg.sender,
            "Sender is not authorized to make a transfer"
        );
        require(from == owner, "From address must be the NFT owner");
        require(to != address(0), "Invalid address");
        _owners[tokenId] = to;
        _approvedAddresses[tokenId] = address(0);
        _removeIndexedTokenIdByOwner(tokenId, owner);
        _addIndexedTokenId(tokenId, to);
        emit Transfer(from, to, tokenId);
    }

    function _safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private {
        _transfer(from, to, tokenId);
        if (_isSmartContract(to)) {
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

    function _isSmartContract(address addr) private view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(addr)
        }
        return size > 0;
    }

    function _approvedOperator(address owner, address operator)
        private
        view
        returns (bool)
    {
        return _operators[owner][operator];
    }

    function _ownerOf(uint256 tokenId) private view returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "NFT is not valid");
        return owner;
    }

    function _approvedAddressOf(uint256 tokenId)
        private
        view
        returns (address)
    {
        _ownerOf(tokenId); // validate tokenId
        return _approvedAddresses[tokenId];
    }

    function _declareSupportedInterfaces() private {
        // IERC165
        _supportedInterfaces[this.supportsInterface.selector] = true;

        // IERC721
        _supportedInterfaces[
            this.balanceOf.selector ^
                this.ownerOf.selector ^
                bytes4(
                    keccak256("safeTransferFrom(address,address,uint256,bytes)")
                ) ^
                bytes4(keccak256("safeTransferFrom(address,address,uint256)")) ^
                this.transferFrom.selector ^
                this.approve.selector ^
                this.getApproved.selector ^
                this.setApprovalForAll.selector ^
                this.isApprovedForAll.selector
        ] = true;

        // IERC721Metadata
        _supportedInterfaces[
            this.name.selector ^ this.symbol.selector ^ this.tokenURI.selector
        ] = true;

        // IERC721Enumerable
        _supportedInterfaces[
            this.totalSupply.selector ^
                this.tokenByIndex.selector ^
                this.tokenOfOwnerByIndex.selector
        ] = true;

        // Invalid acording to IERC165
        _supportedInterfaces[0xffffffff] = false;
    }

    function _totalSupply() private view returns (uint256) {
        return _validTokens;
    }

    function _addIndexedTokenId(uint256 tokenId, address owner) private {
        uint256[] storage tokenIdsByOwner = _indexedTokenIdsByOwner[owner];
        tokenIdsByOwner.push(tokenId);
    }

    function _removeIndexedTokenIdByOwner(uint256 tokenId, address owner)
        private
    {
        _removeTokenIdFromArray(tokenId, _indexedTokenIdsByOwner[owner]);
    }

    function _removeTokenIdFromArray(
        uint256 tokenId,
        uint256[] storage tokenIds
    ) private {
        uint256 index;
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenId == tokenIds[i]) {
                index = i;
            }
        }
        tokenIds[index] = tokenIds[tokenIds.length - 1];
        tokenIds.pop();
    }
}
