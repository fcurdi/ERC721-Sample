const SpaceArt = require("../../../build/contracts/SpaceArt.json");
const generateTokenUris = require("../../utils/generate-token-uris");

module.exports = async (callback) => {
  try {
    const networkId = await web3.eth.net.getId();
    var contract = new web3.eth.Contract(
      SpaceArt.abi,
      SpaceArt.networks[networkId].address
    );
    const address = (await web3.eth.getAccounts())[4];
    const tokenUri = (await generateTokenUris())[6];
    const receipt = await contract.methods
      .create(tokenUri)
      .send({ from: address });
    console.log(receipt);
    await callback();
  } catch (e) {
    await callback(e);
  }
};
