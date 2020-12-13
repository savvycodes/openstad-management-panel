const {createReadStream} = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

const mongoService = require('../services/mongo');

/**
 * Get Cms Attachments
 *
 * @param dbName
 *
 * @returns {Promise<Array>}
 */
exports.getAttachments = async (dbName) => {
  const aposDocuments = await mongoService.query(dbName, 'aposDocs');
  const aposAttachments = await mongoService.query(dbName, 'aposAttachments');

  const files = [];
  aposDocuments.forEach((entry) => {
    if (entry.published === true && entry.trash === false) {
      if (entry.type === 'apostrophe-file' || entry.type === 'apostrophe-image') {
        files.push(entry.attachment._id + '-' + entry.attachment.name + '.' + entry.attachment.extension);
      }
      if (entry.type === 'apostrophe-image') {
        ['.full', '.max', '.one-half', '.one-sixth', '.one-third', '.two-thirds'].forEach((size) => {
          files.push(entry.attachment._id + '-' + entry.attachment.name + size + '.' + entry.attachment.extension);
        });
      }
    }
  });

  aposAttachments.forEach((entry) => {
    files.push(entry._id + '-' + entry.name + '.' + entry.extension);
    if (entry.extension.toLowerCase().match(/jpe?g|svg|png|gif/)) {
      ['.full', '.max', '.one-half', '.one-sixth', '.one-third', '.two-thirds'].forEach((size) => {
        files.push(entry._id + '-' + entry.name + size + '.' + entry.extension);
      });
    }
  });

  return files;
};

/**
 * Export mongo database
 *
 * @param uniqueSiteId
 * @param dbName
 *
 * @returns {Promise<string>}
 */
exports.exportDatabase = async (uniqueSiteId, dbName) => {
  const tmpDir = process.env.TMPDIR || './tmp';
  const mongoPath = tmpDir + '/' + uniqueSiteId;
  await mongoService.export(dbName, mongoPath);

  return `${mongoPath}/${dbName}`;
};

/**
 * Import mongo database from directory
 *
 * @param newSite
 * @param mongoPath
 *
 * @returns {Promise<void>}
 */
exports.importCmsDatabase = async (newSite, mongoPath) => {
  console.log('import cms database');
  return mongoService.import(newSite.getCmsDatabaseName(), mongoPath)
};

/**
 * Import cms attachments to new cms
 *
 * @param domain: string
 * @param dir
 * @param attachments
 *
 * @returns {Promise<void>}
 */
exports.importCmsAttachments = async (domain, dir, attachments) => {
  console.log('import cms attachments', domain);
  const formData = new FormData();
  console.log('Attachemnts', attachments)
  console.log('dir', dir)

  attachments.forEach(function(attachment) {
    formData.append('files', createReadStream(dir + '/attachments/' + attachment));
  });

  return await fetch(domain + '/attachment-upload', {
    headers: {"X-Authorization": process.env.SITE_API_KEY},
    method: 'POST',
    body: formData
  });
};
