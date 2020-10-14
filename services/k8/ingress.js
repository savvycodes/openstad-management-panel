const k8s = require('@kubernetes/client-node');

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

/**
 *
 * @param newSite
 * @returns {Promise<{response: http.IncomingMessage; body: NetworkingV1beta1Ingress}>}
 */
exports.add = async (newSite) => {
  return getK8sApi().createNamespacedIngress(process.env.KUBERNETES_NAMESPACE, getIngressBody(newSite.getCmsDatabaseName(), newSite.getDomain()));
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
}
