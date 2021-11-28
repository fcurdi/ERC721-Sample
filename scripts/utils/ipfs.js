const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");
const { pathTo } = require("./files");
require("dotenv").config();

const pinFileToIPFS = async (filePath, name) => {
  const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;
  let data = new FormData();
  data.append("file", fs.createReadStream(pathTo(filePath)));

  const metadata = JSON.stringify({ name });
  data.append("pinataMetadata", metadata);

  try {
    const response = await axios.post(url, data, {
      maxBodyLength: "Infinity",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET,
      },
    });
    return response.data.IpfsHash;
  } catch (e) {
    throw new Error("Error uploading file to IPFS");
  }
};

const pinJSONToIPFS = async (json, name) => {
  const url = `https://api.pinata.cloud/pinning/pinJSONToIPFS`;
  try {
    const body = {
      pinataMetadata: {
        name,
      },
      pinataContent: {
        ...json,
      },
    };
    const response = await axios.post(url, body, {
      headers: {
        pinata_api_key: process.env.PINATA_API_KEY,
        pinata_secret_api_key: process.env.PINATA_API_SECRET,
      },
    });
    return response.data.IpfsHash;
  } catch (e) {
    throw new Error("Error uploading json to IPFS");
  }
};

module.exports = {
  pinFileToIPFS,
  pinJSONToIPFS,
};
