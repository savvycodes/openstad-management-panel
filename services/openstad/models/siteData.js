module.exports = function SiteData(site, choiceGuides, cmsAttachments, mongoPath, oauthClients) {
  this.apiData = {site, choiceGuides};
  this.cmsData = {attachments: cmsAttachments, mongoPath};
  this.oauthData = {clients: oauthClients};
};
