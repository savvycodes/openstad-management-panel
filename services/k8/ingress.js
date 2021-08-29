const k8s = require('@kubernetes/client-node');

const getHostnameFromRegex = (url) => {
  var prefix = 'https://';

  if (url.substr(0, prefix.length) !== prefix) {
    url = prefix + url;
  }
  // run against regex
  const matches = url ? url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i) : false;
  // extract hostname (will be null if no match is found)
  return matches && matches[1];
}

const getK8sApi = () => {
  const kc = new k8s.KubeConfig();
  kc.loadFromCluster();
  return k8sApi = kc.makeApiClient(k8s.NetworkingV1beta1Api);
}

/**
 *
 * @param domain
 * @returns {Promise<*>}
 */
const deleteIngress = async (ingressName) => {
  return getK8sApi().deleteNamespacedIngress(ingressName, process.env.KUBERNETES_NAMESPACE);
};

const add  = async (domain) => {
  return getK8sApi().createNamespacedIngress(process.env.KUBERNETES_NAMESPACE, getIngressBody(domain));

  /*const ingress = k8Ingress.get(newSite.getDomain());

  if (ingress) {
    return ingress;
  } else {
  }*/
};

/**
 * Create a unique name based upon the domain
 * @param domain
 * @returns {*}
 */
const formatIngressName = (domain) => {
  return Math.round(new Date().getTime() / 1000) + domain.replace(/\W/g, '').slice(0,40);
}

/**
 * Return the body to create / replace a namespaced ingress through the API
 *
 * @param domain
 * @returns {{metadata: {name: *, annotations: {"cert-manager.io/cluster-issuer": string, "kubernetes.io/ingress.class": string}}, apiVersions: string, kind: string, spec: {rules: [{host: *, http: {paths: [{path: string, backend: {servicePort: number, serviceName: string}}]}}], tls: [{secretName: *, hosts: [*]}]}}}
 */
const getIngressBody = (domain) => {
  return {
    apiVersions: 'networking.k8s.io/v1beta1',
    kind: 'Ingress',
    metadata: {
      name: formatIngressName(domain),
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
        host: domain,
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
        secretName:  formatIngressName(domain),
        hosts: [domain]
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
exports.ensureIngressForAllDomains = async (domains) => {
  console.log('Set all domains', domains);

  // make sure we have a consistent root
  domains = domains.map((domain, index, self) => {
    return getHostnameFromRegex( domain);
  });

  // filter to make sure unique domains
  domains = domains.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });

  const domainsToCreate = [];

  const ingresses = await getAll();

  domains.forEach((domain) => {
    console.log('Get ingress for domain: ', domain);

    domain = getHostnameFromRegex(domain);

    console.log('Get ingress for domain cleaned up: ', domain);

    const ingress = ingresses.find((ingress) => {
      console.log('Get ingress for domain check following ingress ', ingress.metadata.name);

      const domainsInIngress = ingress.spec && ingress.spec.rules && ingress.spec.rules.map((rule) => {
        return rule.host;
      });

      console.log('Get ingress for domain check see if domain is in here ', domain);

      return domainsInIngress.includes(domain);
    });

    console.log('Found ingress ', ingress);

    /**
     * In case no ingress exists for this domain add to create
     */
    if (!ingress) {
      console.log('Create ingress for domain because no ingress is present', domain);
      domainsToCreate.push(domain);
    }
  });
  const domainsInIngress = {};




    ingresses.forEach((ingress) => {
      console.log('Get ingress for domain check following ingress ', ingress);

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
  console.log('Domains PASSED', domains);

  console.log('Domains found in ingress', domainsInIngress);

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

  domainsToCreate.forEach(async (domain) => {
    try {
      await add(domain);
    } catch (e) {
      console.log('Errrr, e', e);
    }
  });

  console.log('domainsToDelete', domainsToDelete);

  // filter to make sure unique domains
  domainsToDelete = domainsToDelete.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });

  domainsToDelete.forEach(async (domain) => {
    const ingressData = domainsInIngress[domain];
    try {
      console.log('Delete ingress with name ', ingressData);
      await deleteIngress (ingressData.ingressName);
    } catch (e) {
      console.log('Error when deleting ingress', e)
    }
  });
};

/**
 *
 * @param newSite
 * @returns {Promise<{response: http.IncomingMessage; body: NetworkingV1beta1Ingress}>}
 */
exports.add = add;




