import storageProvider from '../services/storage/index.js';

export const storageInfo = {
  provider: storageProvider.name,
  type: storageProvider.type,
  basePath: storageProvider.basePath,
};

export default storageProvider;

