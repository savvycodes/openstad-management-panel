module.exports = (url) => {
  return url.replace(['http://', 'https://'], '').replace('www.', '');
};
