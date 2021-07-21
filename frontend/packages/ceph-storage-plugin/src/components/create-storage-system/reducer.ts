import * as _ from 'lodash';
import { ExternalState, ExternalStateKeys, ExternalStateValues } from './external-storage/types';
import { BackingStorageType, DeploymentType } from '../../constants/create-storage-system';

export type WizardState = CreateStorageSystemState;
export type WizardDispatch = React.Dispatch<CreateStorageSystemAction>;

export type WizardCommonProps = {
  state: WizardState;
  dispatch: WizardDispatch;
};

export type WizardNodeState = {
  name: string;
  hostName: string;
  cpu: string;
  memory: string;
  zone: string;
  uid: string;
  roles: string[];
};

/* State of CreateStorageSystem */
export const initialState: CreateStorageSystemState = {
  stepIdReached: 1,
  storageClass: { name: '', provisioner: '' },
  backingStorage: {
    type: BackingStorageType.EXISTING,
    externalStorage: '',
    deployment: DeploymentType.ALL,
    isAdvancedOpen: false,
  },
  capacityAndNodes: {
    nodes: [],
    capacity: '2Ti',
    enableArbiter: false,
  },
  createStorageClass: {},
  connectionDetails: {},
};

type CreateStorageSystemState = {
  stepIdReached: number;
  storageClass: { name: string; provisioner?: string };
  backingStorage: {
    type: BackingStorageType;
    externalStorage: string;
    deployment: DeploymentType;
    isAdvancedOpen: boolean;
  };
  createStorageClass: ExternalState;
  connectionDetails: ExternalState;
  capacityAndNodes: {
    nodes: WizardNodeState[];
    capacity: string;
    enableArbiter: boolean;
  };
};

/* Reducer of CreateStorageSystem */
export const reducer: WizardReducer = (prevState, action) => {
  const newState = _.cloneDeep(prevState);
  switch (action.type) {
    case 'wizard/setStepIdReached':
      newState.stepIdReached = action.payload;
      break;
    case 'wizard/setStorageClass':
      newState.storageClass = {
        name: action.payload.name,
        provisioner: action.payload?.provisioner,
      };
      break;
    case 'wizard/setCreateStorageClass':
      newState.createStorageClass = {
        ...newState.createStorageClass,
        [action.payload.field]: action.payload.value,
      };
      break;
    case 'wizard/setConnectionDetails':
      newState.connectionDetails = {
        ...newState.connectionDetails,
        [action.payload.field]: action.payload.value,
      };
      break;
    case 'backingStorage/setType':
      newState.backingStorage.type = action.payload;
      break;
    case 'backingStorage/setDeployment':
      newState.backingStorage.deployment = action.payload;
      break;
    case 'backingStorage/setExternalStorage':
      newState.backingStorage.externalStorage = action.payload;
      break;
    case 'backingStorage/setIsAdvancedOpen':
      newState.backingStorage.isAdvancedOpen = action.payload;
      break;
    case 'capacityAndNodes/nodes':
      newState.capacityAndNodes.nodes = action.payload;
      break;
    case 'capacityAndNodes/capacity':
      newState.capacityAndNodes.capacity = action.payload;
      break;
    default:
      throw new TypeError(`${action} is not a valid reducer action`);
  }
  return newState;
};

export type WizardReducer = (
  prevState: CreateStorageSystemState,
  action: CreateStorageSystemAction,
) => CreateStorageSystemState;

/* Actions of CreateStorageSystem */
type CreateStorageSystemAction =
  | { type: 'wizard/setStepIdReached'; payload: number }
  | {
      type: 'backingStorage/setDeployment';
      payload: WizardState['backingStorage']['deployment'];
    }
  | {
      type: 'backingStorage/setIsAdvancedOpen';
      payload: WizardState['backingStorage']['isAdvancedOpen'];
    }
  | {
      type: 'wizard/setStorageClass';
      payload: WizardState['storageClass'];
    }
  | {
      type: 'wizard/setCreateStorageClass';
      payload: { field: ExternalStateKeys; value: ExternalStateValues };
    }
  | {
      type: 'wizard/setConnectionDetails';
      payload: { field: ExternalStateKeys; value: ExternalStateValues };
    }
  | { type: 'backingStorage/setType'; payload: WizardState['backingStorage']['type'] }
  | {
      type: 'backingStorage/setExternalStorage';
      payload: WizardState['backingStorage']['externalStorage'];
    }
  | { type: 'capacityAndNodes/nodes'; payload: WizardState['capacityAndNodes']['nodes'] }
  | { type: 'capacityAndNodes/capacity'; payload: WizardState['capacityAndNodes']['capacity'] };
