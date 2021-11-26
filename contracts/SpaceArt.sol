// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";

// TODO ERC721Enumerable

contract SpaceArt is IERC165, IERC721, IERC721Metadata {
    mapping(address => uint256) _balances;

    /// The zero address indicates an invalid NFT.
    mapping(uint256 => address) _owners;

    mapping(address => mapping(address => bool)) _operators;

    /// The zero address indicates there is no approved address.
    mapping(uint256 => address) _approvedAddresses;

    // for ERC165
    mapping(bytes4 => bool) _supportedInterfaces;

    mapping(uint256 => string) _tokenUris;

    uint256 private nextTokenId;
    uint256 private maxTokensCreated = 5;

    constructor() {
        _declareSupportedInterfaces();
    }

    function create(string memory tokenUri) public {
        require(nextTokenId < maxTokensCreated, "All tokens already created");
        address tokenOwner = msg.sender;
        uint256 tokenId = nextTokenId;
        _balances[tokenOwner]++;
        _owners[tokenId] = tokenOwner;
        _tokenUris[tokenId] = tokenUri;
        nextTokenId++;
        emit Transfer(address(0), tokenOwner, tokenId);
    }

    function destroy(uint256 tokenId) public {
        address tokenOwner = _ownerOf(tokenId);
        _balances[tokenOwner]--;
        _owners[tokenId] = address(0);
        _approvedAddresses[tokenId] = address(0);
        _tokenUris[tokenId] = "";
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
        require(owner != address(0), "Invalid address");
        balance = _balances[owner];
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

        // Invalid acording to IERC165
        _supportedInterfaces[0xffffffff] = false;
    }
}
