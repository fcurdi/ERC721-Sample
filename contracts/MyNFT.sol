// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

//TODO emit events, ERC721Metadata
contract MyNFT is IERC721 {
    mapping(address => uint256) _balances;

    /// The zero address indicates an invalid NFT.
    mapping(uint256 => address) _owners;

    mapping(address => mapping(address => bool)) _operators;

    /// The zero address indicates there is no approved address.
    mapping(uint256 => address) _approvedAddresses;

    function balanceOf(address owner) external view returns (uint256 balance) {
        require(owner != address(0), "Invalid address");
        balance = _balances[owner];
    }

    function ownerOf(uint256 tokenId) external view returns (address owner) {
        owner = _owners[tokenId];
        require(owner != address(0));
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
        // TODO validate from, to not zero addresses?
        address owner = _owners[tokenId];
        require(owner != address(0), "NFT is not valid");
        require(
            msg.sender == owner ||
                _operators[owner][msg.sender] ||
                _approvedAddresses[tokenId] == msg.sender,
            "Sender is not authorized to make a transfer"
        );
        require(from == owner, "From address must be the NFT owner");
        require(to != address(0));
        _owners[tokenId] = to;
        // TODO refactor this with _safeTransferFrom.
    }

    function approve(address to, uint256 tokenId) external {
        address owner = _owners[tokenId];
        require(
            msg.sender == owner || _operators[owner][msg.sender],
            "Sender is not owner nor operator"
        );
        _approvedAddresses[tokenId] = to;
    }

    function setApprovalForAll(address operator, bool _approved) external {
        // TODO check that operator is not zero address?
        _operators[msg.sender][operator] = _approved;
    }

    function getApproved(uint256 tokenId)
        external
        view
        returns (address operator)
    {
        address owner = _owners[tokenId];
        require(owner != address(0), "NFT is not valid");
        operator = _approvedAddresses[tokenId];
    }

    function isApprovedForAll(address owner, address operator)
        external
        view
        returns (bool)
    {
        // TODO check that operator is not zero address?
        return _operators[owner][operator];
    }

    /// @notice Query if a contract implements an interface
    /// @param interfaceId The interface identifier, as specified in ERC-165
    /// @dev Interface identification is specified in ERC-165. This function
    ///  uses less than 30,000 gas.
    /// @return `true` if the contract implements `interfaceID` and
    ///  `interfaceID` is not 0xffffffff, `false` otherwise
    function supportsInterface(bytes4 interfaceId)
        external
        view
        returns (bool)
    {
        // TODO
        // IERC165
    }

    function _safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) private {
        // TODO validate from, to not zero addresses?
        address owner = _owners[tokenId];
        require(owner != address(0), "NFT is not valid");
        require(
            msg.sender == owner ||
                _operators[owner][msg.sender] ||
                _approvedAddresses[tokenId] == msg.sender,
            "Sender is not authorized to make a transfer"
        );
        require(from == owner, "From address must be the NFT owner");
        require(to != address(0));
        _owners[tokenId] = to;

        // check if address is smart contract (code size > 0)
        uint256 size;
        assembly {
            size := extcodesize(to)
        }
        bool isSmartContract = size > 0;
        //

        if (isSmartContract) {
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
}
