const cleanUrl = require('../../../utils/cleanUrl');
const ensureUrlHasProtocol = require('../../../utils/ensureUrlHasProtocol');
const formatBaseDomain = require('../../../utils/formatBaseDomain');

const tmpPath = process.env.TMPDIR || './tmp';
const protocol = process.env.FORCE_HTTP ? 'http' : 'https';


/**
 * New Site model for create, copy, import, export new Openstad resources
 * @param domain
 * @param title
 * @param fromEmail
 * @param fromName
 */
module.exports = function NewSite(domain, title, fromEmail, fromName) {
  console.log('domain in new site', domain);

  const uniqueSiteId = Math.round(new Date().getTime() / 1000) + domain.replace(/\W/g, '').slice(0,40);

  console.log('uniqueSiteId in new site', uniqueSiteId);

  //also used for mongodb db name, so don't add longer then 64 chars
  this.uniqueSiteId = uniqueSiteId;
  this.domain = cleanUrl(domain);
  this.domainWithProtocol = ensureUrlHasProtocol(domain);
  this.cmsDatabaseName = this.uniqueSiteId;// Remove spaces and special characters
  this.tmpDir = tmpPath + '/' + this.uniqueSiteId;
  this.fromEmail = fromEmail;

  this.formattedFromEmail = fromName ? `${fromName} <${fromEmail}>` : fromEmail;
  this.fromName = fromName;
  this.title = title;

  this.getUniqueSiteId = () => this.uniqueSiteId;
  this.getBaseDomain = () => formatBaseDomain(this.domain);
  this.getDomain = () => this.domain;
  this.getDomainWithProtocol = () => this.domainWithProtocol;
  this.getCmsDatabaseName = () => this.cmsDatabaseName;
  this.getTmpDir = () => this.tmpDir;
  this.getFromEmail = () => this.fromEmail;
  this.getFormattedFromEmail = () => this.formattedFromEmail;
  this.getFromName = () => this.fromName;
  this.getTitle = () => this.title;
};
