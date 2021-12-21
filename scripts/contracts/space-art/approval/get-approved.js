const exec = require("../../../utils/exec");

module.exports = (callback) =>
  exec(callback, web3, (contract) => {
    return contract.methods.getApproved(2).call();
  });
