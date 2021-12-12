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
  let spaceArt, firstAccount, secondAccount;
  [firstAccount, secondAccount, _] = accounts;

  beforeEach(async () => {
    spaceArt = await SpaceArt.new();
  });

  describe("IERC721 implementation", async () => {
    describe("Minting", async () => {
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
    describe("Burning", async () => {
      it("Not authorized", async () => {
        // TODO
      });
      it("Invalid tokenId", async () => {
        // TODO
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
    describe("Transfer", async () => {});
    describe("Approval", async () => {});
  });

  describe("IERC165 implementation", async () => {
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

  describe("IERC721Metadata implementation", async () => {
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

  describe("IERC721Enumerable implementation", async () => {
    it("TODO", async () => {});
  });
});
