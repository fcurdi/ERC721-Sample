const exec = require("../../../utils/exec");

module.exports = (callback) =>
  exec(callback, web3, (contract) => {
    const from = "";
    const to = "";
    const tokenId = 2;
    return contract.methods.approve(to, tokenId).send({ from });
  });
