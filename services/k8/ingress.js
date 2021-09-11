const k8s = require('@kubernetes/client-node');
const serverPublicIP = process.env.PUBLIC_IP;
const siteApi = require('../siteApi');
const dns = require('dns');
/**
 * Ingress files get created / deleted
 *
 * Principle is auto check,
 *
 * So we run through all, and check if changes, so EDIT / DELETE / CREATE, is all the same logic.
 * This is because, edit a domain is sometimes also a Delete.
 * And some domains run on domain.com/site1. Then we need to make sure the domain exists.
 * So there can be sites with domain.com, domain.com/site, etc. So it's not as simple as an ingress file per site.
 * Domains are always saved without www.
 *
 * Some other caveats:
 *  - Some sites have www added, some not, need
 *    If we add www. standard always then the auto certificates won't be valid for wildcard dns because Let's encrypt will try to validate both www.
 *    and it's DNS wise not allowed to set www.*.subdomain
 *
 *  - When DNS is not set to the server, then
 *
 *  - It's wanted th
 *
 *  - It's possible to not create ingress for site by adding site.config.ingress.disable: true
 *
 *   - It's possible to set www. for site in site.config.ingress.www: true
 *
 *  - When ingress exists we don't delete it when DNS is changed, might cause instability,
 *    however, it might cause problems long term if not detected
 *
 *    - Cert manager also uses ingress to fetch a new SSL, we check to make sure we don't delete those
 */

const dnsLookUp = (domain) => {
  return new Promise((resolve, reject) => {
    dns.lookup(domain, (err, address, family) => {
      if (err) reject(err);
      resolve(address);
    });
  });
};

const getHostnameFromRegex = (url) => {
  var prefix = 'https://';

  if (url.substr(0, prefix.length) !== prefix) {
    url = prefix + url;
  }
  // run against regex
  const matches = url ? url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i) : false;
  // extract hostname (will be null if no match is found)
  let hostname = matches && matches[1];

  if (hostname.startsWith('www.')) {
    hostname = url.substr('www.'.length);
  }

  return hostname;
}

const getK8sApi = () => {
  const kc = new k8s.KubeConfig();
  kc.loadFromCluster();
  return k8sApi = kc.makeApiClient(k8s.NetworkingV1beta1Api);
}


const shouldDomainHaveWww = (sites, domain) => {
  const sitesForDomain = getSitesForDomain(sites, domain);
  // if one site has www. set, we assume should be for all
  const sitesWithWww = sitesForDomain.filter((site) => {
    return site.config && site.config.ingress && site.config.ingress.www;
  });

  return sitesWithWww && sitesWithWww.length > 0;
}

const getTlsSecretNameForDomain = (sites, domain) => {
  const sitesForDomain = getSitesForDomain(sites, domain);

  let secretName = '';

  // when multiple sites have different secretnames, that will cause an issue
  // will select the latest
  // it's unlikely to lead to bugs however.
  // since users only set this if they explicitly install tls
  // if empty let's encrypt takes care of it
  sitesForDomain.forEach((site) => {
    if (!secretName) {
      secretName = site.config && site.config.ingress && site.config.ingress.tlsSecretName ? site.config.ingress.tlsSecretName : false;
    }
  });

  return secretName;
}

const getSitesForDomain = (sites, domain) => {
  return sites.filter((site) => {
    return domain === getHostnameFromRegex(site.domain);
  });
}


/**
 *
 * @param domain
 * @returns {Promise<*>}
 */
const deleteIngress = async (ingressName) => {
  return getK8sApi().deleteNamespacedIngress(ingressName, process.env.KUBERNETES_NAMESPACE);
};

const add = async (ingressName, domain, addWww, tslSecret) => {
  return getK8sApi().createNamespacedIngress(process.env.KUBERNETES_NAMESPACE, getIngressBody(ingressName, domain, addWww, tslSecret));
};

const update = async (ingressName, domain, addWww, tslSecret) => {
  return getK8sApi().replaceNamespacedIngress(ingressName, process.env.KUBERNETES_NAMESPACE, getIngressBody(ingressName, domain, addWww, tslSecret));
};


/**
 * Create a unique name based upon the domain
 * @param domain
 * @returns {*}
 */
const formatIngressName = (domain) => {
  return Math.round(new Date().getTime() / 1000) + domain.replace(/\W/g, '').slice(0, 40);
}

/**
 * Return the body to create / replace a namespaced ingress through the API
 *
 * @param domain
 * @returns {{metadata: {name: *, annotations: {"cert-manager.io/cluster-issuer": string, "kubernetes.io/ingress.class": string}}, apiVersions: string, kind: string, spec: {rules: [{host: *, http: {paths: [{path: string, backend: {servicePort: number, serviceName: string}}]}}], tls: [{secretName: *, hosts: [*]}]}}}
 */
const getIngressBody = (ingressName, domain, addWww, secretName) => {
  const domains = [domain];

  if (addWww) {
    domains.push('www.' + domain);
  }

  return {
    apiVersions: 'networking.k8s.io/v1beta1',
    kind: 'Ingress',
    metadata: {
      name: ingressName,
      annotations: {
        'cert-manager.io/cluster-issuer': 'openstad-letsencrypt-prod', // Todo: make this configurable
        'kubernetes.io/ingress.class': 'nginx',
        'nginx.ingress.kubernetes.io/from-to-www-redirect': "true",
        'nginx.ingress.kubernetes.io/proxy-body-size': '128m',
        'nginx.ingress.kubernetes.io/configuration-snippet': `more_set_headers "X-Content-Type-Options: nosniff";
more_set_headers "X-Frame-Options: SAMEORIGIN";
more_set_headers "X-Xss-Protection: 1";
more_set_headers "Referrer-Policy: same-origin";`
      }
    },
    spec: {
      rules: [{
        host: domains,
        http: {
          paths: [{
            backend: {
              serviceName: 'openstad-frontend', // Todo: make this configurable
              servicePort: 4444 // Todo: make this configurable
            },
            path: '/'
          }]
        }
      }],
      tls: [{
        secretName: secretName ? secretName : ingressName,
        hosts: domains
      }]
    }
  }
};
const getAll = async () => {
  let response = await getK8sApi().listNamespacedIngress(process.env.KUBERNETES_NAMESPACE);
  response = response.response ? response.response : {};
  return response.body && response.body.items ? response.body.items : [];
}

exports.getAll = getAll;

/***
 * There are many domains
 */
exports.ensureIngressForAllDomains = async (sites) => {

  if (!process.env.KUBERNETES_NAMESPACE) {
    return false;
  }

  if (!Array.isArray(sites) || sites.length === 0) {
    return false;
  }

  let domains = sites.filter((site) => {
    const ingressDisabled = site && site.config && site.config.ingress && site.config.ingress.disabled;
    return !!site.domain && !ingressDisabled;
  }).map((site) => {
    return site.domain;
  });

  // make sure we have a consistent root
  domains = domains.map((domain, index, self) => {
    return getHostnameFromRegex(domain);
  });

  // filter to make sure unique domains
  domains = domains.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });

  const domainsToCreate = [];
  const domainsToUpdate = {};

  const ingresses = await getAll();

  domains.forEach((domain) => {
    domain = getHostnameFromRegex(domain);


    const ingress = ingresses.find((ingress) => {

      const domainsInThisIngress = ingress.spec && ingress.spec.rules && ingress.spec.rules.map((rule) => {
        return rule.host;
      });

      console.log('Get ingress for domain check see if domain is in here ', domain);

      return domainsInThisIngress.includes(domain);
    });



    console.log('Found ingress ', ingress);

    /**
     * In case no ingress exists for this domain add to create
     */
    if (!ingress) {
      console.log('Create ingress for domain because no ingress is present', domain);
      domainsToCreate.push(domain);
    } else  {
      const domainsInThisIngress = ingress.spec && ingress.spec.rules && ingress.spec.rules.map((rule) => {
        return rule.host;
      });
      // if there is more then one, it\s www. and gets stripped anyway, so doesnt matter

      // if ingesss exists check if domain
      const hasWww = !!domainsInThisIngress.find((domain) => {
        domain.startsWith('www.')
      });

      const secretNameForDomain =  getTlsSecretNameForDomain(sites, domain);

      const addWww = shouldDomainHaveWww(sites, domain);

      const tslConfigForDomain = ingress.spec && ingress.spec.tls && ingress.spec.tls.find((config) => {
        return config.hosts.includes(domain);
      });
      const updateTlsSecretname = tslConfigForDomain.sercretName !== secretNameForDomain;

      console.log('updateTlsSecretname for domain ', domain, ' tslConfigForDomain.sercretName', tslConfigForDomain.sercretName)

      console.log('updateTlsSecretname for domain ', domain, ' secretNameForDomain', secretNameForDomain)

      console.log('shouldDomainHaveWww for domain ', addWww);


      if(addWww || updateTlsSecretname) {
        domainsToUpdate[domain] = {
          domain: domain,
          ingressName: ingress.metadata.name
        }
      }
    }
  });

  const domainsInIngress = {};

  ingresses.forEach((ingress) => {
    const domainsFound = ingress.spec && ingress.spec.rules && ingress.spec.rules.map((rule) => {
      return rule.host;
    });

    domainsFound.forEach((domain) => {
      domainsInIngress[domain] = {
        domain: domain,
        ingressName: ingress.metadata.name
      };
    })

  });

  const systemIngresses = ['openstad-admin', "openstad-frontend", "openstad-image", "openstad-api", "openstad-auth"];

  // filter all domains present
  let domainsToDelete = Object.keys(domainsInIngress).filter((domainInIngress) => {
    // when domain is in ingress, but not in the database, remove it.

    return !domains.find(domain => domain === domainInIngress);
  }).filter((domainInIngress) => {
    const ingressData = domainsInIngress[domainInIngress];
    // never delete ingress from system
    return !systemIngresses.find(ingressName => ingressName === ingressData.ingressName)
  });

  console.log('domainsToCreate', domainsToCreate);

  /**
   * Get all site objects with domain as hostname
   * Often it's only one domain like: westbegroot.amsterdam.nl
   *
   * But also possible to have multiple:
   *
   * So for instance
   *  - stemmen.amsterdam.nl/site1
   *  - stemmen.amsterdam.nl
   *  - stemmen.amsterdam.nl/site3
   */
  for(const domainToCreate in domainsToCreate) {
    try {
      await IngressForDomain(domainToCreate, sites);
    } catch (e) {
      console.log('Errrr, e', e);
    }
  }


  for(let domainToUpdate of Object.keys(domainsToUpdate)) {
    try {
      console.log('domainToUpdate', domainToUpdate)
      const ingressName = domainsToUpdate[domainToUpdate].ingressName;

      console.log('Update domain ', domainToUpdate, ' with ingress name ', ingressName)
     // await processIngressForDomain(domain, sites, ingressName);
    } catch (e) {
      console.log('Errrr, e', e);
    }
  }


  console.log('domainsToDelete', domainsToDelete);

  // filter to make sure unique domains
  domainsToDelete = domainsToDelete.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });

  domainsToDelete.forEach(async (domain) => {
    const ingressData = domainsInIngress[domain];
    try {
      console.log('Delete ingress with name ', ingressData);
      await deleteIngress(ingressData.ingressName);
    } catch (e) {
      console.log('Error when deleting ingress', e)
    }
  });
};


const processIngreprocessssForDomain = async (domain, sites, ingressName) => {
  const sitesForDomain = getSitesForDomain(sites, domain);
  const addWww = shouldDomainHaveWww(sites, domain);

  const ipAddressForDomain = await dnsLookUp(domain);
  const ipAddressForWWWDomain = await dnsLookUp('www.' + domain);

  const dnsIsSet = ipAddressForDomain && ipAddressForDomain === serverPublicIP;
  const dnsIsSetForWWW  = ipAddressForWWWDomain && ipAddressForWWWDomain === serverPublicIP;

  // dns is valid when www is not required and default dns isset, otherwise we also need to check if www dns isset;
  const dnsIsValid = (!addWww && dnsIsSet) && (addWww && dnsIsSet && dnsIsSetForWWW);

  const ingressConfigFields = {
    dnsIsSet: dnsIsSet,
    dnsIsSetForWWW: dnsIsSetForWWW,
    ipAddressForDomain: ipAddressForDomain,
    ipAddressForWWWDomain: ipAddressForWWWDomain,
    dnsIsValid: dnsIsValid,
  }

  console.log('processIngressForDomain ingressConfigFields', ingressConfigFields);

  const secretNameForDomain =  getTlsSecretNameForDomain(sites, domain);

  try {
    let body = getIngressBody(formatIngressName(domain), domain, addWww, secretNameForDomain);
    body = body ? JSON.stringify(body) : false;
    console.log('getIngressBody ingressConfigFields for domain ', domain, body);
  } catch(e) {
    console.log('erroror loggin ingress body', e)
  }

  // in case
  if (dnsIsValid) {

    if (ingressName) {

      const response = await update(ingressName, domain, addWww, secretNameForDomain);


    } else {
      const response = await add(formatIngressName(domain), domain, addWww, secretNameForDomain);
    }

    if (response) {
      ingressConfigFields.created = true;
      ingressConfigFields.ingressName = ingressName;
    } else {
      ingressConfigFields.created = false;
    }
    // in case dnsIs invalid and ingressName exists we "try to delete"
  } else if (!dnsIsValid && ingressName) {
    try {
      await deleteIngress(ingressName)
    } catch (e) {
      console.log('Failed to delete ingress after dns not set', ingressName)
    }
  }


  for(const site in sitesForDomain) {
    const config = site.config;
    config.ingress = config.ingress ? Object.assign(config.ingress, ingressConfigFields) : {};
    site.config = config;
    await siteApi.update(null, site.id, site);
  }
}

/**
 *
 * @param newSite
 * @returns {Promise<{response: http.IncomingMessage; body: NetworkingV1beta1Ingress}>}
 */
exports.add = add;




