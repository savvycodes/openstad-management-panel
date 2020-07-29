const {createReadStream} = require('fs');
const fetch = require('node-fetch');
const FormData = require('form-data');

const mongoService = require('../services/mongo');

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

exports.exportDatabase = async (uniqueSiteId, dbName) => {
  const tmpDir = process.env.TMPDIR || './tmp';
  const mongoPath = tmpDir + uniqueSiteId;
  await mongoService.export(dbName, mongoPath);

  return `${mongoPath}/${dbName}`;
};

exports.importCmsDatabase = async (newSite, mongoPath) => {
  return mongoService.import(newSite.getCmsDatabaseName(), mongoPath)
};

exports.importCmsAttachments = async (domain, dir, attachments) => {
  const formData = new FormData();

  attachments.forEach(function(attachment) {
    formData.append('files', createReadStream(dir + '/attachments/' + attachment));
  });

  return await fetch(domain + '/attachment-upload', {
    headers: {"X-Authorization": process.env.SITE_API_KEY},
    method: 'POST',
    body: formData
  });
};
