const fs = require("fs");
const path = require("path");

const pathTo = (route) => path.resolve(__dirname, route);

const readDirs = (route) => fs.readdirSync(pathTo(route));

const readJsonFile = (route) => {
  const path = pathTo(route);
  return fs.existsSync(path) ? JSON.parse(fs.readFileSync(path)) : null;
};

const writeJsonFile = (route, json) =>
  fs.writeFileSync(pathTo(route), JSON.stringify(json, null, 4));

module.exports = {
  readDirs,
  readJsonFile,
  pathTo,
  writeJsonFile,
};
