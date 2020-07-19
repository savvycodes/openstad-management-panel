const fs = require('fs').promises;

/**
 * Writes data to file.
 *
 * @param filePath
 * @param data
 * @returns {Promise<void>}
 */
const writeOauthDataToFile = async (filePath, data) => {
  return fs.writeFile(req.export.dir + '/oauth/' + key + '.json', json + '\n');
};
