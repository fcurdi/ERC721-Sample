const { readDirs, readJsonFile, writeJsonFile } = require("./files");
const { pinFileToIPFS, pinJSONToIPFS } = require("./ipfs");

const basePath = "../../metadata";
async function generateTokenURIs() {
  const tokenUris = [];
  const directories = readDirs(basePath);
  for (dir of directories) {
    // dir = ["nft1", "nft2", ...]
    const metadataFilePath = `${basePath}/${dir}/metadata.json`;
    const metadata = readJsonFile(metadataFilePath);
    if (!metadata.image) {
      // upload images to ipfs and update metadata.json file
      const imageHash = await pinFileToIPFS(
        `${basePath}/${dir}/img.jpeg`,
        `${dir}-img`
      );
      metadata.image = `https://gateway.pinata.cloud/ipfs/${imageHash}`;
      writeJsonFile(metadataFilePath, metadata);
    }
    const tokenUriFilePath = `${basePath}/${dir}/tokenUri.json`;
    let tokenUri = readJsonFile(tokenUriFilePath)?.value;
    if (!tokenUri) {
      // upload metadata json to ipfs and store tokenUri
      const metadataHash = await pinJSONToIPFS(metadata, `${dir}-metadata`);
      tokenUri = `https://gateway.pinata.cloud/ipfs/${metadataHash}`;
      writeJsonFile(tokenUriFilePath, { value: tokenUri });
    }
    tokenUris.push(tokenUri);
  }
  return tokenUris;
}

module.exports = generateTokenURIs;
