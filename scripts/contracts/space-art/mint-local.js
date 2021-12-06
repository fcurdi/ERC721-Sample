const Web3 = require("web3");
const SpaceArt = require("../../../build/contracts/SpaceArt.json");
const generateTokenUris = require("../../utils/generate-token-uris");

module.exports = async (callback) => {
  try {
    const web3 = new Web3("http://localhost:8545");
    const networkId = await web3.eth.net.getId();
    var contract = new web3.eth.Contract(
      SpaceArt.abi,
      SpaceArt.networks[networkId].address
    );
    const accounts = await web3.eth.getAccounts();
    const tokenUris = await generateTokenUris();
    for (const tokenUri of tokenUris) {
      const randomAccountIndex =
        Math.floor(Math.random() * 10) % accounts.length;
      const account = accounts[randomAccountIndex];
      await contract.methods
        .create(tokenUri)
        .send({ from: account, gas: 300000 });
    }
    await callback();
  } catch (e) {
    await callback(e);
  }
};
