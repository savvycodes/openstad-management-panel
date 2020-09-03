module.exports = (url) => {
  return url.replace(/^https?:\/\//,'').replace('www.', '');
};
