/* Copyright Contributors to the Open Cluster Management project */

import { ExternalLinkAltIcon } from '@patternfly/react-icons'
import { TFunction } from 'react-i18next'
import { AcmButton } from '../ui-components'

export const DOC_VERSION = '2.9'

export const DOC_HOME = `https://access.redhat.com/documentation/en-us/red_hat_advanced_cluster_management_for_kubernetes/${DOC_VERSION}`
export const DOC_BASE_PATH = `${DOC_HOME}/html-single`
export const OCP_DOC_BASE_PATH = 'https://docs.openshift.com/container-platform'

export const DOC_CREATE_HOSTED_CLUSTER = `${DOC_BASE_PATH}/clusters/index#create-hosted-aws`
export const DOC_CREATE_kUBEVIRT_CLUSTER = `${DOC_BASE_PATH}/clusters/index#creating-a-hosted-cluster-kubevirt`

export const DOC_LINKS = {
  CLUSTERS: `${DOC_BASE_PATH}/clusters/index#cluster-intro`,
  CREATE_CONNECTION: `${DOC_BASE_PATH}/clusters/index#credentials`,
  CREATE_CONNECTION_AWS: `${DOC_BASE_PATH}/clusters/index#creating-a-credential-for-amazon-web-services`,
  CREATE_CONNECTION_AZURE: `${DOC_BASE_PATH}/clusters/index#creating-a-credential-for-microsoft-azure`,
  CREATE_CONNECTION_GCP: `${DOC_BASE_PATH}/clusters/index#creating-a-credential-for-google-cloud-platform`,
  CREATE_CONNECTION_VMWARE: `${DOC_BASE_PATH}/clusters/index#creating-a-credential-for-vmware-vsphere`,
  CREATE_CONNECTION_OPENSTACK: `${DOC_BASE_PATH}/clusters/index#creating-a-credential-for-openstack`,
  CREATE_CONNECTION_VIRTUALIZATION: `${DOC_BASE_PATH}/clusters/index#creating-a-credential-for-virtualization`,
  CREATE_CONNECTION_ANSIBLE: `${DOC_BASE_PATH}/clusters/index#creating-a-credential-for-ansible`,
  CREATE_CONNECTION_REDHATCLOUD: `${DOC_BASE_PATH}/clusters/index#creating-a-credential-for-openshift-cluster-manager`,
  CREATE_CONNECTION_PROXY: `${DOC_BASE_PATH}/clusters/index#cluster-intro`,
  CREATE_CONNECTION_PROXY_VMWARE: `${DOC_BASE_PATH}/clusters/index#proxy-vm`,
  CREATE_CONNECTION_PROXY_AWS: `${DOC_BASE_PATH}/clusters/index#proxy-aws`,
  CREATE_CONNECTION_PROXY_AZURE: `${DOC_BASE_PATH}/clusters/index#proxy-azure`,
  CREATE_CONNECTION_PROXY_GCP: `${DOC_BASE_PATH}/clusters/index#proxy-google`,
  CREATE_CONNECTION_PROXY_OPENSTACK: `${DOC_BASE_PATH}/clusters/index#proxy-openstack`,
  CREATE_CONNECTION_PROXY_VIRTUALIZATION: `${DOC_BASE_PATH}/clusters/index#proxy-virtualization`,
  CREATE_CLUSTER: `${DOC_BASE_PATH}/clusters/index#creating-a-cluster`,
  CREATE_CLUSTER_ON_PREMISE: `${DOC_BASE_PATH}/clusters/index#creating-a-cluster-on-premises`,
  CREATE_CLUSTER_PREREQ: `${DOC_BASE_PATH}/clusters/index#create-a-cluster-prereq`,
  IMPORT_CLUSTER: `${DOC_BASE_PATH}/clusters/index#importing-a-target-managed-cluster-to-the-hub-cluster`,
  CLUSTER_SETS: `${DOC_BASE_PATH}/clusters/index#managedclustersets-intro`,
  GLOBAL_CLUSTER_SET: `${DOC_BASE_PATH}/clusters/index#managedclustersets_global`,
  CLUSTER_POOLS: `${DOC_BASE_PATH}/clusters/index#managing-cluster-pools`,
  CLUSTER_CLAIMS: `${DOC_BASE_PATH}/clusters/index#claiming-clusters-from-cluster-pools`,
  SUBMARINER: `${DOC_BASE_PATH}/networking/index#submariner`,
  CONFIG_DISCONNECTED_INSTALL: `${DOC_BASE_PATH}/clusters/index#cluster-intro`,
  CIM_CONFIG_DISONNECTED: `${DOC_BASE_PATH}/clusters/index#enable-cim`,
  CIM_CONFIG: `${DOC_BASE_PATH}/clusters/index#enable-cim`,
  CIM_CONFIG_AWS: `${DOC_BASE_PATH}/clusters/index#enable-cim-aws`,
  CONFIG_DISCONNECTED_INSTALL_VMWARE: `${DOC_BASE_PATH}/clusters/index#disconnected-vm`,
  CONFIG_DISCONNECTED_INSTALL_OPENSTACK: `${DOC_BASE_PATH}/clusters/index#disconnected-openstack`,
  INFRASTRUCTURE_EVIRONMENTS: `${DOC_BASE_PATH}/clusters/index#creating-an-infrastructure-environment`,
  DISCOVERED_CLUSTERS: `${DOC_BASE_PATH}/clusters/index#discovery-intro`,
  MANAGE_APPLICATIONS: `${DOC_BASE_PATH}/applications/index#managing-applications`,
  ANSIBLE_JOBS: `${DOC_BASE_PATH}/clusters/index#ansible-config-cluster`,
  POLICIES: `${DOC_BASE_PATH}/governance/index#policy-overview`,
  POLICY_SETS: `${DOC_BASE_PATH}/governance/index#policy-overview`,
  HYPERSHIFT_INTRO: `${DOC_BASE_PATH}/clusters/index#hosted-control-planes-intro`,
  HYPERSHIFT_DEPLOY_AWS: `${DOC_BASE_PATH}/clusters/index#hosted-control-planes-manage-aws`,
  HYPERSHIFT_MANAGE_KUBEVIRT: `${DOC_BASE_PATH}/clusters/index#hosted-control-planes-manage-kubevirt`,
  HOSTED_ENABLE_FEATURE_AWS: `${DOC_BASE_PATH}/clusters/index#hosted-enable-feature-aws`,
  HYPERSHIFT_OIDC: `${DOC_BASE_PATH}/clusters/index#hosted-create-aws-secret`,
  GITOPS_CONFIG: `${DOC_BASE_PATH}/applications/index#gitops-config`,
  DEPRECATIONS_AND_REMOVALS: `${DOC_HOME}/html/release_notes/release-notes#deprecations-removals`,
  ENABLE_OBSERVABILITY: `${DOC_HOME}/html/observability/observing-environments-intro#enabling-observability-service`,
}

export function viewDocumentation(doclink: string, t: TFunction) {
  return (
    <a href={doclink} target="_blank" rel="noreferrer">
      <AcmButton
        variant="link"
        isInline
        icon={<ExternalLinkAltIcon />}
        iconPosition="right"
        style={{
          display: 'inline-block',
          padding: '15px 10px',
          fontSize: '14px',
        }}
      >
        {t('View documentation')}
      </AcmButton>
    </a>
  )
}
