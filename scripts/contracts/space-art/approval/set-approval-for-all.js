const exec = require("../../../utils/exec");

module.exports = (callback) =>
  exec(callback, web3, (contract) => {
    const from = "";
    const operator = "";
    const approved = true;
    return contract.methods
      .setApprovalForAll(operator, approved)
      .send({ from });
  });
