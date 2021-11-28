const Web3 = require("web3");
const SpaceArt = require("../../build/contracts/SpaceArt.json");
const generateTokenUris = require("../utils/generateTokenUris");

const execute = async () => {
  const web3 = new Web3("http://localhost:8545");
  const networkId = await web3.eth.net.getId();
  var contract = new web3.eth.Contract(
    SpaceArt.abi,
    SpaceArt.networks[networkId].address
  );
  const account = (await web3.eth.getAccounts())[0];
  const tokenUris = await generateTokenUris();
  for (const tokenUri of tokenUris) {
    await contract.methods
      .create(tokenUri)
      .send({ from: account, gas: 200000 });
  }
};

execute();
