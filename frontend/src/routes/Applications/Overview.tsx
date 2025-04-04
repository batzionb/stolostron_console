/* Copyright Contributors to the Open Cluster Management project */

import { PageSection, Text, TextContent, TextVariants } from '@patternfly/react-core'
import { ExternalLinkAltIcon } from '@patternfly/react-icons'
import { cellWidth } from '@patternfly/react-table'
import {
  AcmDropdown,
  AcmEmptyState,
  AcmTable,
  compareStrings,
  IAcmRowAction,
  IAcmTableColumn,
} from '../../ui-components'
import { TFunction } from 'react-i18next'
import { useCallback, useEffect, useMemo, useState, useContext } from 'react'
import { useHistory } from 'react-router'
import { Link } from 'react-router-dom'
import { Trans, useTranslation } from '../../lib/acm-i18next'
import { DOC_LINKS, viewDocumentation } from '../../lib/doc-util'
import { checkPermission, rbacCreate, rbacDelete } from '../../lib/rbac-util'
import { NavigationPath } from '../../NavigationPath'
import {
  ApplicationApiVersion,
  ApplicationDefinition,
  ApplicationKind,
  ApplicationSet,
  ApplicationSetApiVersion,
  ApplicationSetDefinition,
  ApplicationSetKind,
  ArgoApplication,
  ArgoApplicationApiVersion,
  ArgoApplicationKind,
  Channel,
  DiscoveredArgoApplicationDefinition,
  getApiVersionResourceGroup,
  IResource,
  OCPAppResource,
  Subscription,
} from '../../resources'
import { useAllClusters } from '../Infrastructure/Clusters/ManagedClusters/components/useAllClusters'
import { DeleteResourceModal, IDeleteResourceModalProps } from './components/DeleteResourceModal'
import ResourceLabels from './components/ResourceLabels'
import { argoAppSetQueryString, subscriptionAppQueryString } from './CreateApplication/actions'
import {
  getAge,
  getAnnotation,
  getAppChildResources,
  getAppSetRelatedResources,
  getClusterCount,
  getClusterCountField,
  getClusterCountSearchLink,
  getClusterCountString,
  getClusterList,
  getSearchLink,
  getSubscriptionsFromAnnotation,
  hostingSubAnnotationStr,
  isArgoApp,
  isResourceTypeOf,
} from './helpers/resource-helper'
import { isLocalSubscription } from './helpers/subscriptions'
import { getArgoDestinationCluster } from './ApplicationDetails/ApplicationTopology/model/topologyArgo'
import { PluginContext } from '../../lib/PluginContext'
import { get } from 'lodash'
import { GetOpenShiftAppResourceMaps } from '../../components/GetDiscoveredOCPApps'
import { getResourceParams } from '../Home/Search/Details/DetailsPage'

const gitBranchAnnotationStr = 'apps.open-cluster-management.io/git-branch'
const gitPathAnnotationStr = 'apps.open-cluster-management.io/git-path'
// support github annotations
const githubBranchAnnotationStr = 'apps.open-cluster-management.io/github-branch'
const githubPathAnnotationStr = 'apps.open-cluster-management.io/github-path'
export const localClusterStr = 'local-cluster'
export const partOfAnnotationStr = 'app.kubernetes.io/part-of'
const appAnnotationStr = 'app'

const fluxAnnotations = {
  helm: ['helm.toolkit.fluxcd.io/name', 'helm.toolkit.fluxcd.io/namespace'],
  git: ['kustomize.toolkit.fluxcd.io/name', 'kustomize.toolkit.fluxcd.io/namespace'],
}

const labelArr: string[] = [
  'kustomize.toolkit.fluxcd.io/name=',
  'helm.toolkit.fluxcd.io/name=',
  'app=',
  'app.kubernetes.io/part-of=',
]

const filterId = 'table-filter-type-acm-application-label'

type IApplicationResource = IResource | OCPAppResource

function isOCPAppResource(resource: IApplicationResource): resource is OCPAppResource {
  return 'label' in resource
}

function isFluxApplication(label: string) {
  let isFlux = false
  Object.entries(fluxAnnotations).forEach(([, values]) => {
    const [nameAnnotation, namespaceAnnotation] = values
    if (label.includes(nameAnnotation) && label.includes(namespaceAnnotation)) {
      isFlux = true
    }
  })
  return isFlux
}

// Map resource kind to type column
function getApplicationType(resource: IApplicationResource, t: TFunction) {
  if (resource.apiVersion === ApplicationApiVersion) {
    if (resource.kind === ApplicationKind) {
      return t('Subscription')
    }
  } else if (resource.apiVersion === ArgoApplicationApiVersion) {
    if (resource.kind === ArgoApplicationKind) {
      return t('Discovered')
    } else if (resource.kind === ApplicationSetKind) {
      return t('Application set')
    }
  } else if (isOCPAppResource(resource)) {
    const isFlux = isFluxApplication(resource.label)
    if (isFlux) {
      return t('Flux')
    }
    return 'OpenShift'
  }
  return '-'
}

export function getAppSetApps(argoApps: IResource[], appSetName: string) {
  const appSetApps: string[] = []

  argoApps.forEach((app) => {
    if (app.metadata?.ownerReferences && app.metadata.ownerReferences[0].name === appSetName) {
      appSetApps.push(app.metadata.name!)
    }
  })

  return appSetApps
}

export function getAppNamespace(resource: IResource) {
  let castType
  if (resource.apiVersion === ArgoApplicationApiVersion && resource.kind === ArgoApplicationKind) {
    castType = resource as ArgoApplication
    return castType.spec.destination.namespace
  }

  return resource.metadata?.namespace
}

export const getApplicationRepos = (resource: IResource, subscriptions: Subscription[], channels: Channel[]) => {
  let castType
  if (resource.apiVersion === ApplicationApiVersion) {
    if (resource.kind === ApplicationKind) {
      const subAnnotations = getSubscriptionsFromAnnotation(resource)
      const appRepos: any[] = []

      for (let i = 0; i < subAnnotations.length; i++) {
        if (isLocalSubscription(subAnnotations[i], subAnnotations)) {
          // skip local sub
          continue
        }
        const subDetails = subAnnotations[i].split('/')

        subscriptions.forEach((sub) => {
          if (sub.metadata.name === subDetails[1] && sub.metadata.namespace === subDetails[0]) {
            const channelStr = sub.spec.channel

            if (channelStr) {
              const chnDetails = channelStr?.split('/')
              const channel = channels.find(
                (chn) => chn.metadata.name === chnDetails[1] && chn.metadata.namespace === chnDetails[0]
              )

              appRepos.push({
                type: channel?.spec.type,
                pathName: channel?.spec.pathname,
                gitBranch: getAnnotation(sub, gitBranchAnnotationStr) || getAnnotation(sub, githubBranchAnnotationStr),
                gitPath: getAnnotation(sub, gitPathAnnotationStr) || getAnnotation(sub, githubPathAnnotationStr),
                package: sub.spec.name,
                packageFilterVersion: sub.spec.packageFilter?.version,
              })
            }
          }
        })
      }
      return appRepos
    }
  } else if (resource.apiVersion === ArgoApplicationApiVersion) {
    if (resource.kind === ArgoApplicationKind) {
      castType = resource as ArgoApplication
      if (!castType.spec.source) {
        return []
      }
      return [
        {
          type: castType.spec.source.path ? 'git' : 'helmrepo',
          pathName: castType.spec.source.repoURL,
          gitPath: castType.spec.source.path,
          chart: castType.spec.source.chart,
          targetRevision: castType.spec.source.targetRevision,
        },
      ]
    } else if (resource.kind === ApplicationSetKind) {
      castType = resource as ApplicationSet
      const appRepos: any[] = []
      if (!castType.spec.template?.spec?.sources && castType.spec.template?.spec?.source) {
        return [
          {
            type: castType.spec.template?.spec?.source.path ? 'git' : 'helmrepo',
            pathName: castType.spec.template?.spec?.source.repoURL,
            gitPath: castType.spec.template?.spec?.source.path,
            chart: castType.spec.template?.spec?.source.chart,
            targetRevision: castType.spec.template?.spec?.source.targetRevision,
          },
        ]
      } else if (castType.spec.template?.spec?.sources) {
        castType.spec.template?.spec?.sources.forEach((source) => {
          appRepos.push({
            type: source.path ? 'git' : source.chart ? 'helmrepo' : 'git',
            pathName: source.repoURL,
            gitPath: source.path,
            chart: source.chart,
            targetRevision: source.targetRevision,
          })
        })
      }
      return appRepos
    }
  }
}

export default function ApplicationsOverview() {
  const { t } = useTranslation()
  const { cluster } = getResourceParams()

  const { dataContext } = useContext(PluginContext)
  const { recoil, atoms } = useContext(dataContext)
  const { useRecoilState } = recoil
  const {
    applicationSetsState,
    applicationsState,
    argoApplicationsState,
    channelsState,
    discoveredApplicationsState,
    discoveredOCPAppResourcesState,
    helmReleaseState,
    namespacesState,
    placementRulesState,
    placementsState,
    placementDecisionsState,
    subscriptionsState,
  } = atoms

  const [applications] = useRecoilState(applicationsState)
  const [applicationSets] = useRecoilState(applicationSetsState)
  const [argoApplications] = useRecoilState(argoApplicationsState)
  const [subscriptions] = useRecoilState(subscriptionsState)
  const [channels] = useRecoilState(channelsState)
  const [placementRules] = useRecoilState(placementRulesState)
  const [placements] = useRecoilState(placementsState)
  const [placementDecisions] = useRecoilState(placementDecisionsState)
  const [namespaces] = useRecoilState(namespacesState)
  const [helmReleases] = useRecoilState(helmReleaseState)
  const { acmExtensions } = useContext(PluginContext)

  const [discoveredOCPAppResources] = useRecoilState(discoveredOCPAppResourcesState)

  const managedClusters = useAllClusters(true)
  const localCluster = useMemo(() => managedClusters.find((cls) => cls.name === localClusterStr), [managedClusters])
  const [modalProps, setModalProps] = useState<IDeleteResourceModalProps | { open: false }>({
    open: false,
  })
  const [argoApplicationsHashSet, setArgoApplicationsHashSet] = useState<Set<string>>(new Set<string>())

  const [discoveredApplications] = useRecoilState(discoveredApplicationsState)

  const [pluginModal, setPluginModal] = useState<JSX.Element>()

  const getTimeWindow = useCallback(
    (app: IResource) => {
      if (!(app.apiVersion === ApplicationApiVersion && app.kind === ApplicationKind)) {
        return ''
      }

      const subAnnotations = getSubscriptionsFromAnnotation(app)
      let hasTimeWindow = false

      for (let i = 0; i < subAnnotations.length; i++) {
        if (isLocalSubscription(subAnnotations[i], subAnnotations)) {
          // skip local sub
          continue
        }
        const subDetails = subAnnotations[i].split('/')

        for (let j = 0; j < subscriptions.length; j++) {
          if (
            subscriptions[j].metadata.name === subDetails[1] &&
            subscriptions[j].metadata.namespace === subDetails[0]
          ) {
            if (subscriptions[j].spec.timewindow) {
              hasTimeWindow = true
              break
            }
          }
        }
      }

      return hasTimeWindow ? t('Yes') : ''
    },
    [subscriptions, t]
  )

  // Cache cell text for sorting and searching
  const generateTransformData = useCallback(
    (tableItem: IResource) => {
      // Cluster column
      const clusterList = getClusterList(
        tableItem,
        argoApplications,
        placementDecisions,
        subscriptions,
        localCluster,
        managedClusters
      )
      const clusterCount = getClusterCount(clusterList)
      const clusterTransformData = getClusterCountString(t, clusterCount, clusterList, tableItem)

      // Resource column
      const resourceMap: { [key: string]: string } = {}
      const appRepos = getApplicationRepos(tableItem, subscriptions, channels)
      let resourceText = ''
      appRepos?.forEach((repo) => {
        if (!resourceMap[repo.type]) {
          resourceText = resourceText + repo.type
        }
        resourceMap[repo.type] = repo.type
      })

      const timeWindow = getTimeWindow(tableItem)
      const transformedNamespace = getAppNamespace(tableItem)
      const transformedObject = {
        transformed: {
          clusterCount: clusterTransformData,
          clusterList: clusterList,
          resourceText: resourceText,
          createdText: getAge(tableItem, '', 'metadata.creationTimestamp'),
          timeWindow: timeWindow,
          namespace: transformedNamespace,
        },
      }

      // Cannot add properties directly to objects in typescript
      return { ...tableItem, ...transformedObject }
    },
    [argoApplications, channels, getTimeWindow, localCluster, managedClusters, placementDecisions, subscriptions, t]
  )

  // Combine all application types
  const applicationTableItems = useMemo(
    () => applications.map(generateTransformData),
    [applications, generateTransformData]
  )

  const applicationSetsTableItems = useMemo(
    () => applicationSets.map(generateTransformData),
    [applicationSets, generateTransformData]
  )

  const argoApplicationTableItems = useMemo(
    () =>
      argoApplications
        .filter((argoApp) => {
          const resources = argoApp.status ? argoApp.status.resources : undefined
          const definedNamespace = get(resources, '[0].namespace')

          // cache Argo app signature for filtering OCP apps later
          setArgoApplicationsHashSet(
            (prev) =>
              new Set(
                prev.add(
                  `${argoApp.metadata.name}-${
                    definedNamespace ? definedNamespace : argoApp.spec.destination.namespace
                  }-${getArgoDestinationCluster(argoApp.spec.destination, managedClusters, 'local-cluster')}`
                )
              )
          )
          const isChildOfAppset =
            argoApp.metadata.ownerReferences && argoApp.metadata.ownerReferences[0].kind === ApplicationSetKind
          if (!argoApp.metadata.ownerReferences || !isChildOfAppset) {
            return true
          }
          return false
        })
        .map(generateTransformData),
    [argoApplications, generateTransformData, managedClusters]
  )

  const discoveredApplicationsTableItems = useMemo(() => {
    const resultingTableItems: any = []

    discoveredApplications.forEach((remoteArgoApp: any) => {
      setArgoApplicationsHashSet(
        (prev) =>
          new Set(prev.add(`${remoteArgoApp.name}-${remoteArgoApp.destinationNamespace}-${remoteArgoApp.cluster}`))
      )
      if (!remoteArgoApp._hostingResource) {
        // Skip apps created by Argo pull model
        resultingTableItems.push(
          generateTransformData({
            apiVersion: ArgoApplicationApiVersion,
            kind: ArgoApplicationKind,
            metadata: {
              name: remoteArgoApp.name,
              namespace: remoteArgoApp.namespace,
              creationTimestamp: remoteArgoApp.created,
            },
            spec: {
              destination: {
                namespace: remoteArgoApp.destinationNamespace,
                name: remoteArgoApp.destinationName,
                server: remoteArgoApp.destinationCluster || remoteArgoApp.destinationServer,
              },
              source: {
                path: remoteArgoApp.path,
                repoURL: remoteArgoApp.repoURL,
                targetRevision: remoteArgoApp.targetRevision,
                chart: remoteArgoApp.chart,
              },
            },
            status: {
              cluster: remoteArgoApp.cluster,
            },
          } as ArgoApplication)
        )
      }
    })

    return resultingTableItems
  }, [discoveredApplications, generateTransformData])

  const ocpAppResourceTableItems = useMemo(() => {
    const openShiftAppResourceMaps = GetOpenShiftAppResourceMaps(
      discoveredOCPAppResources,
      helmReleases,
      argoApplicationsHashSet
    )
    const transformedData: any[] = []

    Object.entries(openShiftAppResourceMaps).forEach(([, value]) => {
      let labelIdx
      let i
      for (i = 0; i < labelArr.length; i++) {
        labelIdx = value.label?.indexOf(labelArr[i])
        if (labelIdx > -1) {
          break
        }
      }
      labelIdx += labelArr[i].length

      const semicolon = value.label?.indexOf(';', labelIdx)
      const appLabel = value.label?.substring(labelIdx, semicolon > -1 ? semicolon : value.label?.length)
      const resourceName = value.name
      transformedData.push(
        generateTransformData({
          apiVersion: value.apigroup ? `${value.apigroup}/${value.apiversion}` : value.apiversion,
          kind: value.kind,
          label: value.label,
          metadata: {
            name: appLabel,
            namespace: value.namespace,
            creationTimestamp: value.created,
          },
          status: {
            cluster: value.cluster,
            resourceName,
          },
        } as OCPAppResource)
      )
    })
    return transformedData
  }, [discoveredOCPAppResources, helmReleases, generateTransformData, argoApplicationsHashSet])

  const tableItems: IResource[] = useMemo(
    () => [
      ...applicationTableItems,
      ...applicationSetsTableItems,
      ...argoApplicationTableItems,
      ...discoveredApplicationsTableItems,
      ...ocpAppResourceTableItems,
    ],
    [
      applicationSetsTableItems,
      applicationTableItems,
      argoApplicationTableItems,
      discoveredApplicationsTableItems,
      ocpAppResourceTableItems,
    ]
  )
  const keyFn = useCallback(
    (resource: IResource) => resource.metadata!.uid ?? `${resource.metadata!.namespace}/${resource.metadata!.name}`,
    []
  )
  const extensionColumns: IAcmTableColumn<IApplicationResource>[] = useMemo(
    () =>
      acmExtensions?.applicationListColumn?.length
        ? acmExtensions.applicationListColumn.map((appListColumn) => {
            const CellComp = appListColumn.cell
            return {
              header: appListColumn.header,
              transforms: appListColumn?.transforms,
              cellTransforms: appListColumn?.cellTransforms,
              tooltip: appListColumn?.tooltip,
              cell: (application) => {
                return <CellComp resource={application} />
              },
            }
          })
        : [],
    [acmExtensions]
  )

  const columns = useMemo<IAcmTableColumn<IApplicationResource>[]>(
    () => [
      {
        header: t('Name'),
        sort: 'metadata.name',
        search: 'metadata.name',
        transforms: [cellWidth(20)],
        cell: (application) => {
          let clusterQuery = ''
          let apiVersion = `${application.kind.toLowerCase()}.${application.apiVersion?.split('/')[0]}`
          if (
            (application.apiVersion === ArgoApplicationApiVersion && application.kind === ArgoApplicationKind) ||
            (application.kind !== ApplicationKind && application.kind !== ApplicationSetKind)
          ) {
            const cluster = application?.status?.cluster
            clusterQuery = cluster ? `&cluster=${cluster}` : ''
          }
          if (
            application.apiVersion !== ApplicationApiVersion &&
            application.apiVersion !== ArgoApplicationApiVersion
          ) {
            const labels = (application as OCPAppResource).label
            if (
              labels.includes(`${fluxAnnotations.git[0]}=`) ||
              labels.includes(`${fluxAnnotations.git[1]}=`) ||
              labels.includes(`${fluxAnnotations.helm[0]}=`) ||
              labels.includes(`${fluxAnnotations.helm[1]}=`)
            ) {
              apiVersion = 'flux'
            } else if (labels.includes(`${appAnnotationStr}=`) || labels.includes(partOfAnnotationStr)) {
              apiVersion = 'ocp'
            }
          }
          return (
            <span style={{ whiteSpace: 'nowrap' }}>
              <Link
                to={
                  NavigationPath.applicationDetails
                    .replace(':namespace', application.metadata?.namespace as string)
                    .replace(':name', application.metadata?.name as string) +
                  '?apiVersion=' +
                  apiVersion +
                  clusterQuery
                }
              >
                {application.metadata?.name}
              </Link>
            </span>
          )
        },
      },
      {
        header: t('Type'),
        cell: (resource) => <span>{getApplicationType(resource, t)}</span>,
        sort: 'kind',
        tooltip: (
          <span>
            {t('Displays the type of the application. ')}
            <TextContent>
              <Text
                component={TextVariants.a}
                isVisitedLink
                href={DOC_LINKS.MANAGE_APPLICATIONS}
                target="_blank"
                style={{
                  cursor: 'pointer',
                  display: 'inline-block',
                  padding: '0px',
                  fontSize: '14px',
                  color: '#0066cc',
                }}
              >
                {t('View documentation')} <ExternalLinkAltIcon />
              </Text>
            </TextContent>
          </span>
        ),
        transforms: [cellWidth(15)],
        // probably don't need search if we have a type filter
      },
      {
        header: t('Namespace'),
        cell: (resource) => getAppNamespace(resource),
        sort: 'transformed.namespace',
        search: 'transformed.namespace',
        tooltip: t(
          'Displays the namespace of the application resource, which by default is where the application deploys other resources. For Argo applications, this is the destination namespace.'
        ),
        transforms: [cellWidth(20)],
      },
      {
        header: t('Clusters'),
        cell: (resource) => {
          const clusterList = getClusterList(
            resource,
            argoApplications,
            placementDecisions,
            subscriptions,
            localCluster,
            managedClusters
          )
          const clusterCount = getClusterCount(clusterList)
          const clusterCountString = getClusterCountString(t, clusterCount, clusterList, resource)
          const clusterCountSearchLink = getClusterCountSearchLink(resource, clusterCount, clusterList)
          return getClusterCountField(clusterCount, clusterCountString, clusterCountSearchLink)
        },
        tooltip: t(
          'For Subscription applications, displays the number of remote and local clusters where resources for the application are deployed. For Argo applications, this is the name of the destination cluster. For OpenShift applications, this is the cluster where the application is deployed.'
        ),
        sort: 'transformed.clusterCount',
        search: 'transformed.clusterCount',
      },
      {
        header: t('Repository'),
        cell: (resource) => {
          const appRepos = getApplicationRepos(resource, subscriptions, channels)
          return (
            <ResourceLabels
              appRepos={appRepos!}
              showSubscriptionAttributes={true}
              isArgoApp={isArgoApp(resource) || isResourceTypeOf(resource, ApplicationSetDefinition)}
              translation={t}
            />
          )
        },
        tooltip: t('Provides links to each of the resource repositories used by the application.'),
        sort: 'transformed.resourceText',
        search: 'transformed.resourceText',
      },
      {
        header: t('Time window'),
        cell: (resource) => {
          return getTimeWindow(resource)
        },
        tooltip: t('Indicates if updates to any of the application resources are subject to a deployment time window.'),
        sort: 'transformed.timeWindow',
        search: 'transformed.timeWindow',
      },
      ...extensionColumns,
      {
        header: t('Created'),
        cell: (resource) => {
          return <span>{getAge(resource, '', 'metadata.creationTimestamp')}</span>
        },
        sort: 'metadata.creationTimestamp',
        search: 'transformed.createdText',
      },
    ],
    [
      argoApplications,
      channels,
      getTimeWindow,
      localCluster,
      placementDecisions,
      subscriptions,
      t,
      managedClusters,
      extensionColumns,
    ]
  )

  const filters = useMemo(
    () => [
      {
        label: t('Type'),
        id: filterId,
        options: [
          {
            label: t('Application set'),
            value: `${getApiVersionResourceGroup(ApplicationSetApiVersion)}/${ApplicationSetKind}`,
          },
          {
            label: t('Argo CD'),
            value: `${getApiVersionResourceGroup(ArgoApplicationApiVersion)}/${ArgoApplicationKind}`,
          },
          {
            label: t('Flux'),
            value: 'fluxapps',
          },
          {
            label: 'OpenShift',
            value: 'openshiftapps',
          },
          { label: t('Default OpenShift'), value: 'openshift-default' },
          {
            label: t('Subscription'),
            value: `${getApiVersionResourceGroup(ApplicationApiVersion)}/${ApplicationKind}`,
          },
        ],
        tableFilterFn: (selectedValues: string[], item: IApplicationResource) => {
          return selectedValues.some((value) => {
            if (isOCPAppResource(item)) {
              const isFlux = isFluxApplication(item.label)
              switch (value) {
                case 'openshiftapps':
                  return (
                    !isFlux &&
                    !item.metadata?.namespace?.startsWith('openshift-') &&
                    item.metadata?.namespace !== 'openshift'
                  )
                case 'openshift-default':
                  return (
                    !isFlux &&
                    (item.metadata?.namespace?.startsWith('openshift-') || item.metadata?.namespace === 'openshift')
                  )
                case 'fluxapps':
                  return isFlux
              }
            } else {
              return selectedValues.includes(`${getApiVersionResourceGroup(item.apiVersion)}/${item.kind}`)
            }
          })
        },
      },
      {
        id: 'cluster',
        label: t('Cluster'),
        options: Object.values(managedClusters)
          .map((cluster) => ({
            label: cluster.name,
            value: cluster.name,
          }))
          .sort((lhs, rhs) => compareStrings(lhs.label, rhs.label)),
        tableFilterFn: (selectedValues: string[], item: IApplicationResource) => {
          const clusterList = get(item, 'transformed.clusterList')
          return selectedValues.some((value) => {
            return clusterList.includes(value)
          })
        },
      },
    ],
    [t, managedClusters]
  )

  const history = useHistory()
  const [canCreateApplication, setCanCreateApplication] = useState<boolean>(false)
  const [canDeleteApplication, setCanDeleteApplication] = useState<boolean>(false)
  const [canDeleteApplicationSet, setCanDeleteApplicationSet] = useState<boolean>(false)

  const rowActionResolver = useCallback(
    (resource: IResource) => {
      const actions: IAcmRowAction<any>[] = []

      if (isResourceTypeOf(resource, ApplicationDefinition)) {
        actions.push({
          id: 'viewApplication',
          title: t('View application'),
          click: () => {
            history.push(
              `${
                NavigationPath.applicationOverview
                  .replace(':namespace', resource.metadata?.namespace as string)
                  .replace(':name', resource.metadata?.name as string) + subscriptionAppQueryString
              }`
            )
          },
        })
        actions.push({
          id: 'editApplication',
          title: t('Edit application'),
          click: () => {
            history.push(
              NavigationPath.editApplicationSubscription
                .replace(':namespace', resource.metadata?.namespace as string)
                .replace(':name', resource.metadata?.name as string) + '?context=applications'
            )
          },
        })
      }

      if (isResourceTypeOf(resource, ApplicationSetDefinition)) {
        actions.push({
          id: 'viewApplication',
          title: t('View application'),
          click: () => {
            history.push(
              `${NavigationPath.applicationOverview
                .replace(':namespace', resource.metadata?.namespace as string)
                .replace(':name', resource.metadata?.name as string)}${argoAppSetQueryString}`
            )
          },
        })
        actions.push({
          id: 'editApplication',
          title: t('Edit application'),
          click: () => {
            history.push(
              NavigationPath.editApplicationArgo
                .replace(':namespace', resource.metadata?.namespace as string)
                .replace(':name', resource.metadata?.name as string) + '?context=applicationsets'
            )
          },
        })
      }

      if (isResourceTypeOf(resource, DiscoveredArgoApplicationDefinition)) {
        const argoAppType = resource as ArgoApplication
        if (!argoAppType.spec?.sources) {
          actions.push({
            id: 'viewApplication',
            title: t('View application'),
            click: () => {
              history.push(
                `${NavigationPath.applicationOverview
                  .replace(':namespace', resource.metadata?.namespace as string)
                  .replace(':name', resource.metadata?.name as string)}?apiVersion=application.argoproj.io`
              )
            },
          })
        }
      }

      actions.push({
        id: 'searchApplication',
        title: t('Search application'),
        click: () => {
          const [apigroup, apiversion] = resource.apiVersion.split('/')
          const isOCPorFluxApp = isOCPAppResource(resource)
          const label = isOCPorFluxApp ? resource.label : ''
          const isFlux = isFluxApplication(label)
          const resourceName = resource.status?.resourceName
          const searchLink = isOCPorFluxApp
            ? getSearchLink({
                properties: {
                  namespace: resource.metadata?.namespace,
                  label: !isFlux
                    ? `app=${resource.metadata?.name},app.kubernetes.io/part-of=${resource.metadata?.name}`
                    : `kustomize.toolkit.fluxcd.io/name=${resource.metadata?.name},helm.toolkit.fluxcd.io/name=${resource.metadata?.name}`,
                  cluster: resource.status.cluster,
                },
              })
            : getSearchLink({
                properties: {
                  name: resourceName ? resourceName : resource.metadata?.name,
                  namespace: resource.metadata?.namespace,
                  kind: resource.kind.toLowerCase(),
                  apigroup,
                  apiversion,
                  cluster: resource.status?.cluster ? resource.status?.cluster : 'local-cluster',
                },
              })
          history.push(searchLink)
        },
      })

      if (isOCPAppResource(resource)) {
        actions.push({
          id: 'viewApplication',
          title: t('View application'),
          click: () => {
            const isFlux = isFluxApplication(resource.label)
            const resourceType = isFlux ? 'flux' : 'ocp'
            history.push(
              `${NavigationPath.applicationOverview
                .replace(':namespace', resource.metadata?.namespace as string)
                .replace(':name', resource.metadata?.name as string)}?apiVersion=${resourceType}&cluster=${
                resource.status.cluster
              }`
            )
          },
        })
      }

      if (isResourceTypeOf(resource, ApplicationDefinition) || isResourceTypeOf(resource, ApplicationSetDefinition)) {
        actions.push({
          id: 'deleteApplication',
          title: t('Delete application'),
          click: () => {
            const appChildResources =
              resource.kind === ApplicationKind
                ? getAppChildResources(resource, applications, subscriptions, placementRules, placements, channels)
                : [[], []]
            const appSetRelatedResources =
              resource.kind === ApplicationSetKind ? getAppSetRelatedResources(resource, applicationSets) : ['', []]
            const hostingSubAnnotation = getAnnotation(resource, hostingSubAnnotationStr)
            let modalWarnings: string | undefined
            if (hostingSubAnnotation) {
              const subName = hostingSubAnnotation.split('/')[1]
              modalWarnings = t(
                'This application is deployed by the subscription {{subName}}. The delete action might be reverted when resources are reconciled with the resource repository.',
                { subName }
              )
            }
            setModalProps({
              open: true,
              canRemove: resource.kind === ApplicationSetKind ? canDeleteApplicationSet : canDeleteApplication,
              resource: resource,
              errors: undefined,
              warnings: modalWarnings,
              loading: false,
              selected: appChildResources[0], // children
              shared: appChildResources[1], // shared children
              appSetPlacement: appSetRelatedResources[0],
              appSetsSharingPlacement: appSetRelatedResources[1],
              appKind: resource.kind,
              appSetApps: getAppSetApps(argoApplications, resource.metadata?.name!),
              close: () => {
                setModalProps({ open: false })
              },
              t,
            })
          },
          isDisabled: resource.kind === ApplicationSetKind ? !canDeleteApplicationSet : !canDeleteApplication,
        })
      }

      if (acmExtensions?.applicationAction?.length) {
        acmExtensions.applicationAction.forEach((appAction) => {
          if (appAction?.model ? isResourceTypeOf(resource, appAction?.model) : isOCPAppResource(resource)) {
            const ModalComp = appAction.component
            const close = () => setPluginModal(<></>)
            actions.push({
              id: appAction.id,
              tooltip: appAction?.tooltip,
              tooltipProps: appAction?.tooltipProps,
              addSeparator: appAction?.addSeparator,
              isAriaDisabled: appAction?.isAriaDisabled,
              isDisabled: !canCreateApplication || (appAction?.isDisabled ? appAction?.isDisabled(resource) : false),
              title: appAction.title,
              click: (item) => {
                setPluginModal(<ModalComp isOpen={true} close={close} resource={item} />)
              },
            })
          }
        })
      }

      return actions
    },
    [
      applicationSets,
      applications,
      argoApplications,
      canDeleteApplication,
      canDeleteApplicationSet,
      canCreateApplication,
      channels,
      history,
      placements,
      placementRules,
      subscriptions,
      acmExtensions,
      t,
    ]
  )

  useEffect(() => {
    checkPermission(rbacCreate(ApplicationDefinition), setCanCreateApplication, namespaces)
  }, [namespaces])
  useEffect(() => {
    checkPermission(rbacDelete(ApplicationDefinition), setCanDeleteApplication, namespaces)
  }, [namespaces])
  useEffect(() => {
    checkPermission(rbacDelete(ApplicationSetDefinition), setCanDeleteApplicationSet, namespaces)
  }, [namespaces])

  const appCreationButton = useMemo(
    () => (
      <AcmDropdown
        isDisabled={!canCreateApplication}
        tooltip={!canCreateApplication ? t('rbac.unauthorized') : ''}
        id={'application-create'}
        onSelect={(id) => {
          id === 'create-argo'
            ? history.push(NavigationPath.createApplicationArgo)
            : history.push(NavigationPath.createApplicationSubscription)
        }}
        text={t('Create application')}
        dropdownItems={[
          {
            id: 'psuedo.group.label',
            isAriaDisabled: true,
            text: <span style={{ fontSize: '14px' }}>{t('Choose a type')}</span>,
          },
          {
            id: 'create-argo',
            text: t('Application set'),
          },
          {
            id: 'create-subscription',
            text: t('Subscription'),
          },
        ]}
        isKebab={false}
        isPlain={false}
        isPrimary={true}
        // tooltipPosition={tableDropdown.tooltipPosition}
        // dropdownPosition={DropdownPosition.left}
      />
    ),
    [canCreateApplication, history, t]
  )

  return (
    <PageSection>
      <DeleteResourceModal {...modalProps} />
      {pluginModal}
      <AcmTable<IResource>
        id="applicationTable"
        key="data-table"
        columns={columns}
        keyFn={keyFn}
        items={tableItems}
        filters={filters}
        initialFilters={cluster ? { ['cluster']: [cluster] } : undefined}
        customTableAction={appCreationButton}
        emptyState={
          <AcmEmptyState
            key="appOverviewEmptyState"
            title={t("You don't have any applications")}
            message={
              <Text>
                <Trans
                  i18nKey="Click <bold>Create application</bold> to create your resource."
                  components={{ bold: <strong /> }}
                />
              </Text>
            }
            action={
              <>
                {appCreationButton}
                <TextContent>{viewDocumentation(DOC_LINKS.MANAGE_APPLICATIONS, t)}</TextContent>
              </>
            }
          />
        }
        rowActionResolver={rowActionResolver}
      />
    </PageSection>
  )
}
