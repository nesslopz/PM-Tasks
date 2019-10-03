import Teamwork from './pm/teamwork';
import Provider, { Manager } from './providers';

/**
 * Set a Provider to extenstion context
 * @param manager JSON object
 * @returns Provider
 */
export const setProvider = (manager: Manager):Provider => {
  let provider: Provider;
  switch (manager.id) {
    case 'teamwork':
      provider = new Teamwork(manager);
      break;
    default:
      provider = new Provider(manager);
      break;
  }
  return provider;
}

/**
 * Converts params object to query string
 * @param params { key: "value" }
 * @returns queried string
 */
export const queryParams = (params:any):string => {
  if (!params || Object.keys(params).length === 0)
    return '';
  return '?' + Object.keys(params).map(key => key + '=' + params[key]).join('&');
}

/**
 * TaskList Setting interface
 */
export interface taskListSetting {
  projectId     : string|string[];
  projectManager: string;
}