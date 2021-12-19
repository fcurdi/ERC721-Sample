const SpaceArt = require("../../../build/contracts/SpaceArt.json");
const generateTokenURIs = require("../../utils/generate-token-uris");

const maxTokens = 7;

module.exports = async (callback) => {
  try {
    const networkId = await web3.eth.net.getId();
    var contract = new web3.eth.Contract(
      SpaceArt.abi,
      SpaceArt.networks[networkId].address
    );
    const accounts = await web3.eth.getAccounts();
    const tokenURIs = await generateTokenURIs();
    for (let i = 0; i < maxTokens; i++) {
      const randomIndex = Math.floor(Math.random() * 10) % accounts.length;
      const tokenURI = tokenURIs[i];
      const from = accounts[randomIndex];
      const receipt = await contract.methods.mint(tokenURI).send({ from });
      console.log(receipt);
    }
    await callback();
  } catch (e) {
    await callback(e);
  }
};
