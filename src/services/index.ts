// Services layer - abstracts storage mechanism
// Currently uses IndexedDB, can be swapped for API calls

export * from './types';
export { localDiagramService, saveDiagramWithThumbnail } from './localDiagramService';

// Default service - use local storage for now
// In the future, this can check config and return API service instead
import { localDiagramService } from './localDiagramService';
import { DiagramService, StorageConfig } from './types';

let currentService: DiagramService = localDiagramService;
let config: StorageConfig = { type: 'local' };

export function getConfig(): StorageConfig {
  return config;
}

export function setConfig(newConfig: StorageConfig): void {
  config = newConfig;
  // When API service is implemented:
  // if (newConfig.type === 'api' && newConfig.apiUrl) {
  //   currentService = createApiDiagramService(newConfig.apiUrl);
  // } else {
  //   currentService = localDiagramService;
  // }
}

export function getDiagramService(): DiagramService {
  return currentService;
}

// Convenience exports for direct usage
export const diagramService = {
  get list() { return currentService.list.bind(currentService); },
  get get() { return currentService.get.bind(currentService); },
  get create() { return currentService.create.bind(currentService); },
  get save() { return currentService.save.bind(currentService); },
  get delete() { return currentService.delete.bind(currentService); },
  get exportJSON() { return currentService.exportJSON.bind(currentService); },
  get importJSON() { return currentService.importJSON.bind(currentService); },
  get exportPNG() { return currentService.exportPNG.bind(currentService); },
  get generateThumbnail() { return currentService.generateThumbnail.bind(currentService); },
};
