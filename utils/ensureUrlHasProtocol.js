module.exports = (url) => {
  const protocol = process.env.FORCE_HTTP ? 'http' : 'https';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // if no protocol, assume http
    //
    url = protocol + '://' + url;
  }

  return url;
}
