const SpaceArt = artifacts.require("SpaceArt");
const MockERC721Receiver = artifacts.require("MockERC721Receiver");
const { expect } = require("chai");
const {
  expectEvent,
  expectRevert,
  constants,
  BN,
} = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const tokenIdFrom = (receipt) => receipt.logs[0].args.tokenId;

const allValuesAreDiferent = (...args) => new Set(args).size === args.length;

contract("SpaceArt", async (accounts) => {
  // contracts
  let spaceArt, mockERC721Receiver;

  // accounts
  const [owner, anotherOwner, to, approved, operator] = accounts;

  // misc
  const zero = new BN(0),
    one = new BN(1),
    two = new BN(2),
    three = new BN(3);
  const maxTokens = 7;
  const invalidTokenId = maxTokens + 1;
  const tokenURI = "uri",
    otherTokenURI = "other.uri",
    anotherTokenURI = "another.uri";

  const setUpManagedTokens = async () => {
    await spaceArt.mint(tokenURI, { from: owner });
    const tokenId = tokenIdFrom(
      await spaceArt.mint(otherTokenURI, { from: owner })
    );
    await spaceArt.approve(approved, tokenId, { from: owner });
    await spaceArt.setApprovalForAll(operator, true, { from: owner });
    return tokenId;
  };

  beforeEach(async () => {
    spaceArt = await SpaceArt.new();
    mockERC721Receiver = await MockERC721Receiver.new();
  });

  describe("IERC721 implementation", () => {
    describe("Minting", () => {
      describe("Errors", () => {
        it("should revert when trying to mint more tokens than the max allowed", async () => {
          for (let i = 0; i < maxTokens; i++) {
            await spaceArt.mint(`${tokenURI}${i}`);
          }
          await expectRevert(
            spaceArt.mint(`${tokenURI}${maxTokens + 1}`),
            "All tokens already minted"
          );
        });
      });
      describe("Success", () => {
        it("should mint tokens successfully with diferent ids and assigned owners", async () => {
          const firstReceipt = await spaceArt.mint(tokenURI, {
            from: owner,
          });
          const firstTokenId = tokenIdFrom(firstReceipt);
          const secondReceipt = await spaceArt.mint(otherTokenURI, {
            from: owner,
          });
          const secondTokenId = tokenIdFrom(secondReceipt);
          const thirdReceipt = await spaceArt.mint(anotherTokenURI, {
            from: anotherOwner,
          });
          const thirdTokenId = tokenIdFrom(thirdReceipt);

          expect(
            allValuesAreDiferent(firstTokenId, secondTokenId, thirdTokenId)
          ).to.be.true;
          expect(await spaceArt.ownerOf(firstTokenId)).to.equal(owner);
          expect(await spaceArt.ownerOf(secondTokenId)).to.equal(owner);
          expect(await spaceArt.ownerOf(thirdTokenId)).to.equal(anotherOwner);
          expect(await spaceArt.balanceOf(owner)).to.be.a.bignumber.that.equals(
            two
          );
          expect(
            await spaceArt.balanceOf(anotherOwner)
          ).to.be.a.bignumber.that.equals(one);
          expect(await spaceArt.getApproved(firstTokenId)).to.equal(
            ZERO_ADDRESS
          );
          expect(await spaceArt.getApproved(secondTokenId)).to.equal(
            ZERO_ADDRESS
          );
          expect(await spaceArt.getApproved(thirdTokenId)).to.equal(
            ZERO_ADDRESS
          );
          expectEvent(firstReceipt, "Transfer", {
            from: ZERO_ADDRESS,
            to: owner,
            tokenId: firstTokenId,
          });
          expectEvent(secondReceipt, "Transfer", {
            from: ZERO_ADDRESS,
            to: owner,
            tokenId: secondTokenId,
          });
          expectEvent(thirdReceipt, "Transfer", {
            from: ZERO_ADDRESS,
            to: anotherOwner,
            tokenId: thirdTokenId,
          });
        });
      });
    });
    describe("Burning", () => {
      describe("Errors", () => {
        it("should revert when trying to burn an invalid token", async () => {
          await expectRevert(spaceArt.burn(invalidTokenId), "NFT is not valid");
        });
        it("should revert when sender is not authorized", async () => {
          const tokenId = tokenIdFrom(
            await spaceArt.mint(tokenURI, { from: owner })
          );
          await expectRevert(
            spaceArt.burn(tokenId, { from: to }),
            "Not authorized to burn NFT"
          );
        });
      });
      describe("Success", () => {
        let tokenId;
        beforeEach(async () => {
          tokenId = await setUpManagedTokens();
        });
        const shouldBurnTokenSuccessfullyBy = async (sender) => {
          const receipt = await spaceArt.burn(tokenId, { from: sender });

          expect(await spaceArt.balanceOf(owner)).to.be.a.bignumber.that.equals(
            one
          );
          await expectRevert(spaceArt.ownerOf(tokenId), "NFT is not valid");
          await expectRevert(spaceArt.getApproved(tokenId), "NFT is not valid");
          await expectRevert(spaceArt.tokenURI(tokenId), "NFT is not valid");
          expectEvent(receipt, "Approval", {
            owner: owner,
            approved: ZERO_ADDRESS,
            tokenId,
          });
          expectEvent(receipt, "Transfer", {
            from: owner,
            to: ZERO_ADDRESS,
            tokenId,
          });
        };
        it("should burn token successfully by owner", async () => {
          await shouldBurnTokenSuccessfullyBy(owner);
        });
        it("should burn token successfully by approved address", async () => {
          await shouldBurnTokenSuccessfullyBy(approved);
        });
        it("should burn token successfully by operator", async () => {
          await shouldBurnTokenSuccessfullyBy(operator);
        });
      });
    });
  });
  describe("Transfer", () => {
    describe("Unsafe transfer", () => {
      describe("Errors", () => {
        it("should revert when sender is not owner, operator or approved address", async () => {
          const tokenId = tokenIdFrom(
            await spaceArt.mint("some.uri", { from: owner })
          );
          await expectRevert(
            spaceArt.transferFrom(owner, to, tokenId, {
              from: anotherOwner,
            }),
            "Sender is not authorized to make a transfer"
          );
        });
        it("should revert when from is not the current owner", async () => {
          const tokenId = tokenIdFrom(
            await spaceArt.mint("some.uri", { from: owner })
          );
          await expectRevert(
            spaceArt.transferFrom(anotherOwner, to, tokenId, {
              from: owner,
            }),
            "From address must be the NFT owner"
          );
        });
        it("should revert when to is the zero address", async () => {
          const tokenId = tokenIdFrom(
            await spaceArt.mint("some.uri", { from: owner })
          );
          await expectRevert(
            spaceArt.transferFrom(owner, ZERO_ADDRESS, tokenId, {
              from: owner,
            }),
            "Invalid address"
          );
        });
        it("should revert when tokenId is not valid", async () => {
          await expectRevert(
            spaceArt.transferFrom(owner, to, invalidTokenId, {
              from: owner,
            }),
            "NFT is not valid"
          );
        });
      });
      describe("Success", () => {
        let tokenId;
        beforeEach(async () => {
          tokenId = await setUpManagedTokens();
        });
        const shouldUnsafeTransferSuccessfullyBy = async (sender) => {
          const ownerPreviousBalance = await spaceArt.balanceOf(owner);
          const toPreviousBalance = await spaceArt.balanceOf(to);
          const receipt = await spaceArt.transferFrom(owner, to, tokenId, {
            from: sender,
          });

          expect(ownerPreviousBalance).to.be.a.bignumber.that.equals(two);
          expect(toPreviousBalance).to.be.a.bignumber.that.equals(zero);
          expect(await spaceArt.balanceOf(owner)).to.be.a.bignumber.that.equals(
            one
          );
          expect(await spaceArt.balanceOf(to)).to.be.a.bignumber.that.equals(
            one
          );
          expect(await spaceArt.ownerOf(tokenId)).to.equal(to);
          expect(await spaceArt.getApproved(tokenId)).to.equal(ZERO_ADDRESS);
          expectEvent(receipt, "Transfer", { from: owner, to, tokenId });
          expectEvent(receipt, "Approval", {
            owner,
            approved: ZERO_ADDRESS,
            tokenId,
          });
        };
        it("should transfer successfully when sender is owner", async () => {
          await shouldUnsafeTransferSuccessfullyBy(owner);
        });
        it("should transfer successfully when sender is operator", async () => {
          await shouldUnsafeTransferSuccessfullyBy(operator);
        });
        it("should transfer successfully when sender is approved address", async () => {
          await shouldUnsafeTransferSuccessfullyBy(approved);
        });
      });
    });
    describe("Safe transfer", () => {
      let tokenId;
      beforeEach(async () => {
        tokenId = await setUpManagedTokens();
      });
      const shouldSafeTransferSuccessfully = async ({
        sender,
        data,
        to = mockERC721Receiver.address,
      }) => {
        const ownerPreviousBalance = await spaceArt.balanceOf(owner);
        const toPreviousBalance = await spaceArt.balanceOf(to);
        let receipt;
        if (data) {
          receipt = await spaceArt.methods[
            "safeTransferFrom(address,address,uint256,bytes)"
          ](owner, to, tokenId, data, {
            from: sender,
          });
        } else {
          receipt = await spaceArt.safeTransferFrom(owner, to, tokenId, {
            from: sender,
          });
        }
        expect(ownerPreviousBalance).to.be.a.bignumber.that.equals(two);
        expect(toPreviousBalance).to.be.a.bignumber.that.equals(zero);
        expect(await spaceArt.balanceOf(owner)).to.be.a.bignumber.that.equals(
          one
        );
        expect(await spaceArt.balanceOf(to)).to.be.a.bignumber.that.equals(one);
        expect(await spaceArt.ownerOf(tokenId)).to.equal(to);
        expect(await spaceArt.getApproved(tokenId)).to.equal(ZERO_ADDRESS);
        expectEvent(receipt, "Transfer", { from: owner, to, tokenId });
        expectEvent(receipt, "Approval", {
          owner,
          approved: ZERO_ADDRESS,
          tokenId,
        });
      };
      describe("Errors", () => {
        it("should revert when to does not implement ERC721Receiver", async () => {
          await expectRevert(
            spaceArt.safeTransferFrom(
              owner,
              spaceArt.address, // this contract does not implement ERC721Receiver
              tokenId,
              {
                from: owner,
              }
            ),
            "To address does not implement ERC721Receiver"
          );
        });
        it("should revert when call to onERC721Received reverts", async () => {
          await mockERC721Receiver.mockRevertWhenCalled();
          await expectRevert(
            spaceArt.safeTransferFrom(
              owner,
              mockERC721Receiver.address,
              tokenId,
              {
                from: owner,
              }
            ),
            "reverted"
          );
        });
        it("should revert when call to onERC721Received returns invalid result", async () => {
          await mockERC721Receiver.mockReturnInvalidValueWhenCalled();
          await expectRevert(
            spaceArt.safeTransferFrom(
              owner,
              mockERC721Receiver.address,
              tokenId,
              {
                from: owner,
              }
            ),
            "To address rejected the transfer"
          );
        });
      });
      describe("Success", () => {
        it("should transfer and not call onERC721Received because to address is not a smart contract", async () => {
          await shouldSafeTransferSuccessfully({ sender: owner, to }); // to is not a Smart Contract address
        });
        it("should transfer successfully by owner", async () => {
          await mockERC721Receiver.mockReturnCorrectValueWhenCalled();
          await shouldSafeTransferSuccessfully({ sender: owner });
        });
        it("should transfer successfully by approved address", async () => {
          await mockERC721Receiver.mockReturnCorrectValueWhenCalled();
          await shouldSafeTransferSuccessfully({ sender: approved });
        });
        it("should transfer successfully by operator", async () => {
          await mockERC721Receiver.mockReturnCorrectValueWhenCalled();
          await shouldSafeTransferSuccessfully({ sender: operator });
        });
        it("should transfer successfully with data", async () => {
          await mockERC721Receiver.mockReturnCorrectValueWhenCalled();
          await shouldSafeTransferSuccessfully({
            sender: owner,
            data: web3.utils.asciiToHex("some.data"),
          });
        });
      });
    });
  });
  describe("Approval", () => {
    describe("Approve address", () => {
      describe("Errors", () => {
        it("should revert when trying to approve an invalid tokenId", async () => {
          await expectRevert(
            spaceArt.approve(approved, invalidTokenId, {
              from: owner,
            }),
            "NFT is not valid"
          );
        });
        it("should revert when sender is not owner nor operator", async () => {
          const tokenId = tokenIdFrom(
            await spaceArt.mint(tokenURI, { from: owner })
          );
          await expectRevert(
            spaceArt.approve(approved, tokenId, { from: anotherOwner }),
            "Sender is not owner nor operator"
          );
        });
        it("should revert when sender is approved address", async () => {
          const tokenId = await setUpManagedTokens();
          await expectRevert(
            spaceArt.approve(anotherOwner, tokenId, { from: approved }),
            "Sender is not owner nor operator"
          );
        });
      });
      describe("Success", () => {
        let tokenId;
        beforeEach(async () => {
          tokenId = await setUpManagedTokens();
        });

        const shouldApproveAddressSuccessfullyBy = async (sender) => {
          const receipt = await spaceArt.approve(approved, tokenId, {
            from: sender,
          });

          expect(await spaceArt.getApproved(tokenId)).to.equal(approved);
          expect(await spaceArt.ownerOf(tokenId)).to.equal(owner);
          expectEvent(receipt, "Approval", {
            owner,
            approved,
            tokenId,
          });
        };

        it("should approve address when sender is owner", async () => {
          await shouldApproveAddressSuccessfullyBy(owner);
        });
        it("should approve address when sender is approved operator ", async () => {
          await shouldApproveAddressSuccessfullyBy(operator);
        });
      });
    });

    describe("Approve operator", () => {
      describe("Errors", () => {
        it("should not approve zero address as operator", async () => {
          await expectRevert(
            spaceArt.setApprovalForAll(ZERO_ADDRESS, true, {
              from: owner,
            }),
            "Invalid address"
          );
        });
      });
      describe("Success", () => {
        it("should approve operator", async () => {
          const initApprovedForAll = await spaceArt.isApprovedForAll(
            owner,
            operator
          );
          const approvedReceipt = await spaceArt.setApprovalForAll(
            operator,
            true,
            {
              from: owner,
            }
          );
          const afterApproveForAll = await spaceArt.isApprovedForAll(
            owner,
            operator
          );
          const dissaproveReceipt = await spaceArt.setApprovalForAll(
            operator,
            false,
            {
              from: owner,
            }
          );
          const afetDisapproveForAll = await spaceArt.isApprovedForAll(
            owner,
            operator
          );
          expect(initApprovedForAll).to.be.false;
          expect(afterApproveForAll).to.be.true;
          expect(afetDisapproveForAll).to.be.false;
          expectEvent(approvedReceipt, "ApprovalForAll", {
            owner,
            operator,
            approved: true,
          });
          expectEvent(dissaproveReceipt, "ApprovalForAll", {
            owner,
            operator,
            approved: false,
          });
        });
      });
    });
  });
  describe("IERC165 implementation", () => {
    it("should support IERC721", async () => {
      expect(await spaceArt.supportsInterface("0x80ac58cd")).to.be.true;
    });
    it("should support IERC165", async () => {
      expect(await spaceArt.supportsInterface("0x01ffc9a7")).to.be.true;
    });
    it("should support IERC721Metadata", async () => {
      expect(await spaceArt.supportsInterface("0x5b5e139f")).to.be.true;
    });
    it("should support IERC721Enumerable", async () => {
      expect(await spaceArt.supportsInterface("0x780e9d63")).to.be.true;
    });
    it("should not support 0xffffffff interfaceId", async () => {
      expect(await spaceArt.supportsInterface("0xffffffff")).to.be.false;
    });
  });

  describe("IERC721Metadata implementation", () => {
    it("should return the right name", async () => {
      expect(await spaceArt.name()).to.equal("Space Art");
    });
    it("should return the right symbol", async () => {
      expect(await spaceArt.symbol()).to.equal("SART");
    });
    it("should return the tokenURI provided at creation", async () => {
      const tokenId = tokenIdFrom(await spaceArt.mint(tokenURI));
      expect(await spaceArt.tokenURI(tokenId)).to.equal(tokenURI);
    });
    it("should revert when calling tokenURI with invalid tokenId", async () => {
      await expectRevert(spaceArt.tokenURI(invalidTokenId), "NFT is not valid");
    });
  });

  describe("IERC721Enumerable implementation", () => {
    let tokenId1, tokenId2, tokenId3;
    beforeEach(async () => {
      tokenId1 = tokenIdFrom(await spaceArt.mint(tokenURI, { from: owner }));
      tokenId2 = tokenIdFrom(
        await spaceArt.mint(otherTokenURI, { from: owner })
      );
      tokenId3 = tokenIdFrom(
        await spaceArt.mint(anotherTokenURI, { from: anotherOwner })
      );
    });
    const shouldEnumerateCorrectlyAfterTransfer = async (
      transferFunction,
      data
    ) => {
      if (data) {
        await transferFunction(owner, anotherOwner, tokenId2, data, {
          from: owner,
        });
      } else {
        await transferFunction(owner, anotherOwner, tokenId2, {
          from: owner,
        });
      }
      expect(await spaceArt.totalSupply()).to.be.a.bignumber.that.equals(three);
      expect(await spaceArt.tokenByIndex(zero)).to.be.a.bignumber.that.equals(
        tokenId1
      );
      expect(await spaceArt.tokenByIndex(one)).to.be.a.bignumber.that.equals(
        tokenId2
      );
      expect(await spaceArt.tokenByIndex(two)).to.be.a.bignumber.that.equals(
        tokenId3
      );
      expect(
        await spaceArt.tokenOfOwnerByIndex(owner, zero)
      ).to.be.a.bignumber.that.equals(tokenId1);
      await expectRevert(
        spaceArt.tokenOfOwnerByIndex(owner, one),
        "Invalid index for owner"
      );
      expect(
        await spaceArt.tokenOfOwnerByIndex(anotherOwner, zero)
      ).to.be.a.bignumber.that.equals(tokenId3);
      expect(
        await spaceArt.tokenOfOwnerByIndex(anotherOwner, one)
      ).to.be.a.bignumber.that.equals(tokenId2);
    };
    it("should enumerate tokens correctly after minting", async () => {
      expect(await spaceArt.totalSupply()).to.be.a.bignumber.that.equals(three);
      expect(await spaceArt.tokenByIndex(zero)).to.be.a.bignumber.that.equals(
        tokenId1
      );
      expect(await spaceArt.tokenByIndex(one)).to.be.a.bignumber.that.equals(
        tokenId2
      );
      expect(await spaceArt.tokenByIndex(two)).to.be.a.bignumber.that.equals(
        tokenId3
      );
      expect(
        await spaceArt.tokenOfOwnerByIndex(owner, zero)
      ).to.be.a.bignumber.that.equals(tokenId1);
      expect(
        await spaceArt.tokenOfOwnerByIndex(owner, one)
      ).to.be.a.bignumber.that.equals(tokenId2);
      expect(
        await spaceArt.tokenOfOwnerByIndex(anotherOwner, zero)
      ).to.be.a.bignumber.that.equals(tokenId3);
    });
    it("should enumerate tokens correctly after burning", async () => {
      await spaceArt.burn(tokenId1, { from: owner });
      await spaceArt.burn(tokenId3, { from: anotherOwner });
      expect(await spaceArt.totalSupply()).to.be.a.bignumber.that.equals(one);
      expect(await spaceArt.tokenByIndex(zero)).to.be.a.bignumber.that.equals(
        tokenId2
      );
      await expectRevert(spaceArt.tokenByIndex(one), "Invalid index");
      await expectRevert(spaceArt.tokenByIndex(two), "Invalid index");
      expect(
        await spaceArt.tokenOfOwnerByIndex(owner, zero)
      ).to.be.a.bignumber.that.equals(tokenId2);
      await expectRevert(
        spaceArt.tokenOfOwnerByIndex(owner, one),
        "Invalid index for owner"
      );
      await expectRevert(
        spaceArt.tokenOfOwnerByIndex(anotherOwner, zero),
        "Invalid index for owner"
      );
    });
    it("should enumerate tokens correctly after unsafe transfer", async () => {
      await shouldEnumerateCorrectlyAfterTransfer(spaceArt.transferFrom);
    });
    it("should enumerate tokens correctly after safe transfer without data", async () => {
      await shouldEnumerateCorrectlyAfterTransfer(spaceArt.safeTransferFrom);
    });
    it("should enumerate tokens correctly after safe transfer with data", async () => {
      await shouldEnumerateCorrectlyAfterTransfer(
        spaceArt.methods["safeTransferFrom(address,address,uint256,bytes)"],
        web3.utils.asciiToHex("some.data")
      );
    });
  });
});
