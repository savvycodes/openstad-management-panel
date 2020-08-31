module.exports = (url) => {
  console.log('url', url)
  return url.replace(['http://', 'https://'], '').replace('www.', '');
};
