app.post('/admin/site/:siteId/user-api-client',
  siteMw.withOne,
  (req, res) => {
    return userClientApi.create(token, {
      name,
      siteUrl,
      redirectUrl: '',
      description: '',
      authTypes: ['Url'],
      requiredUserFields: [ "firstName", "lastName", "email" ],
      allowedDomains: [],
      config: {
         "backUrl": "https://buurtbudget.staging.openstadsdeel.nl/",
         "fromName": "Buurtbuddy",
         "fromEmail": "buurtbudget@amsterdam.nl",
         "authTypes": {
           "UniqueCode": {
             "label": "Mijn stemcode:",
             "title": "Controleer stemcode",
             "buttonText": "Controleer stemcode",
             "description": "Om te kunnen stemmen op de website West Begroot vul je hieronder je stemcode in. Deze code heb je thuis gestuurd gekregen. Wij controleren de stemcode op geldigheid. "
           }
         },
         "logoutUrl": "https://buurtbudget.staging.openstadsdeel.nl/logout",
         "projectUrl": "https://www.amsterdam.nl/westbegroot",
         "contactEmail": "niels@denes.nl",
         "requiredFields": {
           "info": "Waarom willen we dit van u weten? Omdat we graag zoveel mogelijk inzicht willen krijgen in waar de voorkeur van de Herengracht en omliggende straten ligt.",
           "title": "Aanvullende gegevens",
           "buttonText": "verstuur",
           "description": "Om uw voorkeur achter te laten hebben we wat extra gegevens van u nodig."
         },
         "clientDisclaimerUrl": "https://westbegroot.staging.openstadsdeel.nl/disclaimer"
       }
    });
  }
);
