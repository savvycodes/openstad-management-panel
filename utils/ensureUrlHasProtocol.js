module.exports = (url) => {
  const protocol = 'https';
  console.log('url ----', url, url.startsWith('http://'))
  console.log('url ----', url, url.startsWith('https://'))

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    // if no protocol, assume http
    //
    url = protocol + '://' + url;
  }

  console.log('url 2', url)


  return url;
}
