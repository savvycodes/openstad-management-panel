const k8s = require('@kubernetes/client-node');

const getHostnameFromRegex = (url) => {
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
 * Return the body to create / replace a namespaced ingress through the API
 *
 * @param databaseName
 * @param domain
 * @returns {{metadata: {name: *, annotations: {"cert-manager.io/cluster-issuer": string, "kubernetes.io/ingress.class": string}}, apiVersions: string, kind: string, spec: {rules: [{host: *, http: {paths: [{path: string, backend: {servicePort: number, serviceName: string}}]}}], tls: [{secretName: *, hosts: [*]}]}}}
 */
const getIngressBody = (databaseName, domain) => {
  return {
    apiVersions: 'networking.k8s.io/v1beta1',
    kind: 'Ingress',
    metadata: {
      name: databaseName,
      annotations: {
        'cert-manager.io/cluster-issuer': 'openstad-letsencrypt-prod', // Todo: make this configurable
        'kubernetes.io/ingress.class': 'nginx'
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
        secretName: databaseName,
        hosts: [domain]
      }]
    }
  }
};
const getAll = async () => {
  return await getK8sApi().listNamespacedIngress(process.env.KUBERNETES_NAMESPACE);
}

exports.getAll = getAll;

/***
 * There are many domains
 */
exports.ensureIngressForAllDomains = async (domains) => {
  console.log('Set all domains', domains);

  // make sure we have a consistent root
  domains = domains.map((value, index, self) => {
    return getHostnameFromRegex(value);
  });

  // filter to make sure unique domains
  domains = domains.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });

  const domainsToCreate = [];

  const ingresses = await getK8sApi().listNamespacedIngress(process.env.KUBERNETES_NAMESPACE);

  domains.forEach((domain) => {
    console.log('Get ingress for domain: ', domain);

    domain = getHostnameFromRegex(domain);

    console.log('Get ingress for domain cleaned up: ', domain);

    const ingress = ingresses.find((ingress) => {
      console.log('Get ingress for domain check following ingress ', ingress);

      const domains = ingress.spec && ingress.spec.rules && ingress.spec.rules.map((rule) => {
        return rule.host;
      });

      console.log('Get ingress for domain check see if domain is in here ', domain);

      return domains.includes(domain);
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

  ingresses.forEach((ingress) => {
    console.log('Get ingress for domain: ', domain);

    const domainsInIngress = [];

    ingresses.forEach((ingress) => {
      console.log('Get ingress for domain check following ingress ', ingress);

      const domainsFound = ingress.spec && ingress.spec.rules && ingress.spec.rules.map((rule) => {
        return rule.host;
      });

      domainsInIngress.concat(domainsFound);
    });

  });

  // filter all domains present
  const domainsToDelete = domainsInIngress.filter((domainInIngress) => {
    return !domains.find(domain => domain === domainInIngress);
  });

  console.log('domainsToCreate', domainsToCreate);

  domainsToCreate.forEach(async (domain) => {
   // await add(domain);
  });

  console.log('domainsToDelete', domainsToDelete);

  domainsToDelete.forEach(async (domain) => {
   // await delete (domain);
  });
};

/**
 *
 * @param newSite
 * @returns {Promise<{response: http.IncomingMessage; body: NetworkingV1beta1Ingress}>}
 */
exports.add = async (newSite) => {
  const ingress = k8Ingress.get(newSite.getDomain());

  if (ingress) {
    return ingress;
  } else {
    return getK8sApi().createNamespacedIngress(process.env.KUBERNETES_NAMESPACE, getIngressBody(newSite.getCmsDatabaseName(), newSite.getDomain()));
  }
};

/**
 *
 * @param databaseName
 * @param newDomain
 * @returns {Promise<*>}
 */
exports.edit = async (databaseName, newDomain) => {
  return getK8sApi().replaceNamespacedIngress(databaseName, process.env.KUBERNETES_NAMESPACE, getIngressBody(databaseName, newDomain));
};


/**
 *
 * @param databaseName
 * @returns {Promise<*>}
 */
exports.delete = async (databaseName) => {
  return getK8sApi().deleteNamespacedIngress(databaseName, process.env.KUBERNETES_NAMESPACE);
};
