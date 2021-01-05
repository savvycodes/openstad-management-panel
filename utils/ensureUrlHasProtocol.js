module.exports = (url) => {
  const protocol = 'https';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // if no protocol, assume http
    //
    url = protocol + '://' + url;
  }

  return url;
}
