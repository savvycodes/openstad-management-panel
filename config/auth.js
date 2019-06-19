
const formatLoginUrl = (slug) => {
  return `/auth/${slug}/login`;
}

const formatRegisterUrl = (slug) => {
  return `/auth/${slug}/register`;
}

const types = [
  {
    key: 'UniqueCode',
    label: 'Unieke code',
    fields : [
      {
        label: 'Title',
        key: 'title',
        default: 'Controleer stemcode',
        type: 'text'
      },
      {
        label: 'Description',
        key: 'description',
        default:'Vul hieronder je unieke code in om een OpenStad account aan te maken. Deze code heb je thuis gestuurd gekregen van ons.',
        type: 'textarea'
      },
      {
        label: 'Label for input field',
        key: 'label',
        default: 'Mijn stemcode',
        type: 'text',
      },
      {
        label: 'Help text',
        key: 'helpText',
        default: 'Let op, de unieke code is hoofdlettergevoelig! Werkt deze nog steeds niet? <a href="mailto:info@openstad.nl">Neem contact met ons op.</a>',
        type: 'textarea',
      },
      {
        label: 'Error message',
        key: 'errorMessage',
        default: 'Vul een geldige stemcode in. Heb je een typefout gemaakt? Stemcodes zijn hoofdlettergevoelig.',
        type: 'textarea',
      }
    ]
  },
  {
    key: 'Local',
    label: 'Inlog via Wachtwoord',
    fields : [
      {
        label: 'Title',
        key: 'title',
        default: 'Inloggen',
        type: 'text'
      },
    ],
  },
  {
    key: 'Url',
    label: 'E-mail een inloglink',
    loginUrl: formatLoginUrl('url'),
    fields : [
      {
        label: 'Title',
        key: 'title',
        default: 'Inloggen',
        type: 'text'
      },
    ],
  }
];

const get = (key) => {
  return types.find(type => type.key === key);
}

exports.types = types;
exports.get = get;
