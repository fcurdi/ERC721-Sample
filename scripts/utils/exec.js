const SpaceArt = require("../../build/contracts/SpaceArt.json");

module.exports = async (callback, web3, operation) => {
  try {
    const networkId = await web3.eth.net.getId();
    var contract = new web3.eth.Contract(
      SpaceArt.abi,
      SpaceArt.networks[networkId].address
    );
    const result = await operation(contract);
    console.log(result);
    await callback();
  } catch (e) {
    await callback(e);
  }
};
