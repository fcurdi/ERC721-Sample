// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract MockERC721Receiver is IERC721Receiver {
    bool private shouldRevert;
    bool private shouldReturnCorrectValue;
    bool private shouldReturnInvalidValue;

    function mockRevertWhenCalled() public {
        shouldRevert = true;
        delete shouldReturnCorrectValue;
        delete shouldReturnInvalidValue;
    }

    function mockReturnCorrectValueWhenCalled() public {
        shouldReturnCorrectValue = true;
        delete shouldRevert;
        delete shouldReturnInvalidValue;
    }

    function mockReturnInvalidValueWhenCalled() public {
        shouldReturnInvalidValue = true;
        delete shouldRevert;
        delete shouldReturnCorrectValue;
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external view returns (bytes4) {
        if (shouldRevert) {
            revert("reverted");
        } else if (shouldReturnCorrectValue) {
            return this.onERC721Received.selector;
        } else if (shouldReturnInvalidValue) {
            return "";
        } else {
            revert("Action not mocked!");
        }
    }
}
