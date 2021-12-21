const exec = require("../../../utils/exec");

module.exports = (callback) =>
  exec(callback, web3, (contract) => {
    const owner = "";
    const operator = "";
    return contract.methods.isApprovedForAll(owner, operator).call();
  });
