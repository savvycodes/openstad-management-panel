const k8s = require('@kubernetes/client-node');

/**
 *
 * @param newSite
 * @returns {Promise<{response: http.IncomingMessage; body: NetworkingV1beta1Ingress}>}
 */
exports.add = async (newSite) => {
  const kc = new k8s.KubeConfig();
  kc.loadFromCluster();

  const k8sApi = kc.makeApiClient(k8s.NetworkingV1beta1Api);

  return k8sApi.createNamespacedIngress(process.env.KUBERNETES_NAMESPACE, {
    apiVersions: 'networking.k8s.io/v1beta1',
    kind: 'Ingress',
    metadata: {
      name: newSite.getCmsDatabaseName(),
      annotations: {
        'cert-manager.io/cluster-issuer': 'openstad-letsencrypt-prod', // Todo: make this configurable
        'kubernetes.io/ingress.class': 'nginx'
      }
    },
    spec: {
      rules: [{
        host: newSite.getDomain(),
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
        secretName: newSite.getCmsDatabaseName(),
        hosts: [newSite.getDomain()]
      }]
    }
  });
};

/**
 *
 * @returns {Promise<Array<string>>}
 */
exports.getExternalIps = async() => {
  const kc = new k8s.KubeConfig();
  kc.loadFromCluster();

  const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

  const response = await k8sApi.readNamespacedService('nginx-ingress-controller', 'default');

  return response.body.spec.externalIPs;
};
