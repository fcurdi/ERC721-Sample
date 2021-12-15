const SpaceArt = artifacts.require("SpaceArt");
const { expect } = require("chai");
const {
  expectEvent,
  expectRevert,
  constants,
  BN,
} = require("@openzeppelin/test-helpers");
const { ZERO_ADDRESS } = constants;

const tokenIdFrom = (receipt) => receipt.logs[0].args.tokenId;

contract("SpaceArt", async (accounts) => {
  let spaceArt,
    firstAccount = accounts[0],
    secondAccount = accounts[1];
  lastAccount = accounts[accounts.length - 1];

  beforeEach(async () => {
    spaceArt = await SpaceArt.new();
  });

  describe("IERC721 implementation", () => {
    describe("Minting", () => {
      it("should not be able to create more tokens than the max allowed", async () => {
        const max = 7;
        for (let i = 0; i < max; i++) {
          await spaceArt.mint(`uri${i}`);
        }
        await expectRevert(spaceArt.mint("uri8"), "All tokens already minted");
      });
      it("should create tokens successfully with diferent ids and assigned owners", async () => {
        const firstReceipt = await spaceArt.mint("some.uri", {
          from: firstAccount,
        });
        const firstTokenId = tokenIdFrom(firstReceipt);
        const secondReceipt = await spaceArt.mint("other.uri", {
          from: firstAccount,
        });
        const secondTokenId = tokenIdFrom(secondReceipt);
        const thirdReceipt = await spaceArt.mint("some.other.uri", {
          from: secondAccount,
        });
        const thirdTokenId = tokenIdFrom(thirdReceipt);
        expect(
          new Set([firstTokenId, secondTokenId, thirdTokenId]).size
        ).to.equal(3); // all diferent

        // owners
        expect(await spaceArt.ownerOf(firstTokenId)).to.equal(firstAccount);
        expect(await spaceArt.ownerOf(secondTokenId)).to.equal(firstAccount);
        expect(await spaceArt.ownerOf(thirdTokenId)).to.equal(secondAccount);

        // balance
        expect(
          await spaceArt.balanceOf(firstAccount)
        ).to.be.a.bignumber.that.equals(new BN(2));
        expect(
          await spaceArt.balanceOf(secondAccount)
        ).to.be.a.bignumber.that.equals(new BN(1));

        // events
        expectEvent(firstReceipt, "Transfer", {
          from: ZERO_ADDRESS,
          to: firstAccount,
          tokenId: firstTokenId,
        });
        expectEvent(secondReceipt, "Transfer", {
          from: ZERO_ADDRESS,
          to: firstAccount,
          tokenId: secondTokenId,
        });
        expectEvent(thirdReceipt, "Transfer", {
          from: ZERO_ADDRESS,
          to: secondAccount,
          tokenId: thirdTokenId,
        });
      });
    });
    describe("Burning", () => {
      it("Not authorized", async () => {
        // TODO
      });
      it("should revert when trying to burn an invalid tokenId", async () => {
        await expectRevert(spaceArt.burn(5), "NFT is not valid");
      });
      it("should burn token successfully", async () => {
        await spaceArt.mint("other.uri", { from: firstAccount });
        const tokenId = tokenIdFrom(
          await spaceArt.mint("some.uri", { from: firstAccount })
        );
        const previousBalance = await spaceArt.balanceOf(firstAccount);
        const receipt = await spaceArt.burn(tokenId);

        expect(previousBalance).to.be.a.bignumber.that.equals(new BN(2));
        expect(
          await spaceArt.balanceOf(firstAccount)
        ).to.be.a.bignumber.that.equals(new BN(1));

        await expectRevert(spaceArt.ownerOf(tokenId), "NFT is not valid");
        await expectRevert(spaceArt.getApproved(tokenId), "NFT is not valid");
        await expectRevert(spaceArt.tokenURI(tokenId), "NFT is not valid");

        expectEvent(receipt, "Approval", {
          owner: firstAccount,
          approved: ZERO_ADDRESS,
          tokenId,
        });
        expectEvent(receipt, "Transfer", {
          from: firstAccount,
          to: ZERO_ADDRESS,
          tokenId,
        });
      });
    });
    describe("Transfer", () => {
      describe("Unsafe transfer", () => {
        it("should revert when sender is not owner, operator or approved address", async () => {
          const tokenId = tokenIdFrom(
            await spaceArt.mint("some.uri", { from: firstAccount })
          );
          await expectRevert(
            spaceArt.transferFrom(firstAccount, lastAccount, tokenId, {
              from: secondAccount,
            }),
            "Sender is not authorized to make a transfer"
          );
        });
        it("should revert when from is not the current owner", async () => {
          const tokenId = tokenIdFrom(
            await spaceArt.mint("some.uri", { from: firstAccount })
          );
          await expectRevert(
            spaceArt.transferFrom(secondAccount, lastAccount, tokenId, {
              from: firstAccount,
            }),
            "From address must be the NFT owner"
          );
        });
        it("should revert when to is the zero address", async () => {
          const tokenId = tokenIdFrom(
            await spaceArt.mint("some.uri", { from: firstAccount })
          );
          await expectRevert(
            spaceArt.transferFrom(firstAccount, ZERO_ADDRESS, tokenId, {
              from: firstAccount,
            }),
            "Invalid address"
          );
        });
      });
      it("should revert when tokenId is not valid", async () => {
        await expectRevert(
          spaceArt.transferFrom(secondAccount, lastAccount, 5, {
            from: firstAccount,
          }),
          "NFT is not valid"
        );
      });

      const shouldTransferFrom = async (owner, sender, to, tokenId) => {
        await spaceArt.mint("some.uri", { from: owner });
        const ownerPreviousBalance = await spaceArt.balanceOf(owner);
        const toPreviousBalance = await spaceArt.balanceOf(to);
        const receipt = await spaceArt.transferFrom(owner, to, tokenId, {
          from: sender,
        });

        expect(ownerPreviousBalance).to.be.a.bignumber.that.equals(new BN(2));
        expect(toPreviousBalance).to.be.a.bignumber.that.equals(new BN(0));
        expect(await spaceArt.balanceOf(owner)).to.be.a.bignumber.that.equals(
          new BN(1)
        );
        expect(await spaceArt.balanceOf(to)).to.be.a.bignumber.that.equals(
          new BN(1)
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

      it("should transfer when sender is owner", async () => {
        const owner = firstAccount,
          sender = owner,
          to = lastAccount;
        const tokenId = tokenIdFrom(
          await spaceArt.mint("other.uri", { from: owner })
        );
        await shouldTransferFrom(owner, sender, to, tokenId);
      });
      it("should transfer when sender is operator", async () => {
        const owner = firstAccount,
          sender = secondAccount,
          to = lastAccount;
        const tokenId = tokenIdFrom(
          await spaceArt.mint("other.uri", { from: owner })
        );
        await spaceArt.setApprovalForAll(sender, true, { from: owner });
        await shouldTransferFrom(owner, sender, to, tokenId);
      });
      it("should transfer when sender is approved address", async () => {
        const owner = firstAccount,
          sender = secondAccount,
          to = lastAccount;
        const tokenId = tokenIdFrom(
          await spaceArt.mint("other.uri", { from: owner })
        );
        await spaceArt.approve(sender, tokenId, { from: owner });
        await shouldTransferFrom(owner, sender, to, tokenId);
      });
    });
    describe("Safe transfer", () => {});
  });
  describe("Approval", () => {
    describe("Approve single address", () => {
      it("should revert when trying to approve an invalid tokenId", async () => {
        await expectRevert(
          spaceArt.approve(secondAccount, 5, { from: firstAccount }),
          "NFT is not valid"
        );
      });

      it("should revert when sender is not owner nor approved operator", async () => {
        const tokenId = tokenIdFrom(
          await spaceArt.mint("some.url", { from: firstAccount })
        );
        await expectRevert(
          spaceArt.approve(firstAccount, tokenId, { from: secondAccount }),
          "Sender is not owner nor operator"
        );
      });

      const shouldApproveAddress = async (owner, sender, approved) => {
        const tokenId = tokenIdFrom(
          await spaceArt.mint("some.url", { from: owner })
        );
        const previousApprovedAddress = await spaceArt.getApproved(tokenId);
        const receipt = await spaceArt.approve(approved, tokenId, {
          from: sender,
        });

        expect(previousApprovedAddress).to.equal(ZERO_ADDRESS);
        expect(await spaceArt.getApproved(tokenId)).to.equal(approved);
        expect(await spaceArt.ownerOf(tokenId)).to.equal(owner);
        expectEvent(receipt, "Approval", {
          owner,
          approved,
          tokenId,
        });
      };

      it("should approve address when sender is owner", async () => {
        const owner = firstAccount,
          sender = owner,
          approved = lastAccount;
        await shouldApproveAddress(owner, sender, approved);
      });
      it("should approve address when sender is approved operator ", async () => {
        const owner = firstAccount,
          sender = secondAccount,
          approved = lastAccount;
        await spaceArt.setApprovalForAll(sender, true, { from: owner });
        await shouldApproveAddress(owner, sender, approved);
      });
    });

    describe("Approve for all", () => {
      it("should not approve zero address to manage all tokens", async () => {
        await expectRevert(
          spaceArt.setApprovalForAll(ZERO_ADDRESS, true, {
            from: firstAccount,
          }),
          "Invalid address"
        );
      });

      it("should approve address to manage all tokens", async () => {
        const initApprovedForAll = await spaceArt.isApprovedForAll(
          firstAccount,
          secondAccount
        );
        await spaceArt.setApprovalForAll(secondAccount, true, {
          from: firstAccount,
        });
        const afterApproveForAll = await spaceArt.isApprovedForAll(
          firstAccount,
          secondAccount
        );
        await spaceArt.setApprovalForAll(secondAccount, false, {
          from: firstAccount,
        });
        const afetDisapproveForAll = await spaceArt.isApprovedForAll(
          firstAccount,
          secondAccount
        );
        expect(initApprovedForAll).to.be.false;
        expect(afterApproveForAll).to.be.true;
        expect(afetDisapproveForAll).to.be.false;
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
      const contract = await SpaceArt.deployed();
      expect(await contract.supportsInterface("0x5b5e139f")).to.be.true;
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
      const tokenURI = "some.token.uri";
      const tokenId = tokenIdFrom(await spaceArt.mint(tokenURI));
      expect(await spaceArt.tokenURI(tokenId)).to.equal(tokenURI);
    });
    it("should revert when calling tokenURI with invalid tokenId", async () => {
      await expectRevert(spaceArt.tokenURI(1), "NFT is not valid");
    });
  });

  describe("IERC721Enumerable implementation", () => {
    it("TODO", async () => {});
  });
});
