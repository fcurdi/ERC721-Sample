const exec = require("../../../utils/exec");

module.exports = (callback) =>
  exec(callback, web3, (contract) => {
    const sender = "";
    const from = "";
    const to = "";
    const tokenId = 3;
    return contract.methods
      .safeTransferFrom(from, to, tokenId)
      .send({ from: sender });
  });
