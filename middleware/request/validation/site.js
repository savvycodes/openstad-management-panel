const appUrl = process.env.APP_URL;
const siteConfigSchema = require('../../../config/site').configSchema;

const PATTERN = 'pattern';

/**
 *
 * @param value
 * @param pattern
 * @param field
 * @returns {string|boolean}
 */
function validate (value, pattern, field) {
  const regExp = new RegExp(`[${pattern}]`);
  const matches = regExp.test(value)
  if (matches === false) {
    return true;
  }

  return `${field.label} should not contain special characters like: ${pattern}`;
}

/**
 *
 * @param {string} url
 * @returns {string}
 */
function getRefererUrl(url) {
  if (url.startsWith(process.env.APP_URL) === true) {
    return url;
  }
  console.error('Url not trusted', url);
  return appUrl;
}

/**
 * Validate fields
 * @param req
 * @returns {*[]}
 */
function validateFields(req) {
  const errors = [];

  Object.keys(siteConfigSchema).forEach(key => {
    if (! req.body.config[key]) {
      return;
    }
    const fields = siteConfigSchema[key];
    fields.forEach(field => {
      const bodyValue = req.body.config[key][field.key];
      if (! bodyValue) {
        return;
      }
      if (field.trim) {
        req.body.config[key][field.key] = bodyValue.trim();
      }

      if (!field.validation) {
        return;
      }

      field.validation.forEach(validationType => {
        if (validationType.name === PATTERN) {
          const valid = validate(bodyValue, validationType.value, field);
          if (valid === true) {
            return;
          }
          errors.push(valid);
        }
      })
    })
  })

  return errors;
}

/**
 * Request validation middleware
 * Loop through siteConfigSchema fields to check if they have validation options enabled
 * @param req
 * @param res
 * @param next
 * @returns {*}
 */
module.exports = (req, res, next) => {
  if (!req.body || !req.body.config) {
    return next();
  }

  const errors = validateFields(req);

  if (errors.length > 0) {
    req.flash('error', { msg: errors.join(',')});
    const redirectUrl = getRefererUrl(req.header('Referer'));
    return res.redirect(redirectUrl);
  }

  next();
}
