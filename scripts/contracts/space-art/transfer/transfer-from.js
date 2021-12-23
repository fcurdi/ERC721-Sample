const exec = require("../../../utils/exec");

module.exports = (callback) =>
  exec(callback, web3, (contract) => {
    const sender = "";
    const from = "";
    const to = "";
    const tokenId = 6;
    return contract.methods.transferFrom(from, to, tokenId).send({ from: sender });
  });
