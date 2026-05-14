// Reexport the native module. On web, it will be resolved to ExpoGeocodingModule.web.ts
// and on native platforms to ExpoGeocodingModule.ts
export { default } from './ExpoGeocodingModule';
export { default as ExpoGeocodingView } from './ExpoGeocodingView';
export * from  './ExpoGeocoding.types';
