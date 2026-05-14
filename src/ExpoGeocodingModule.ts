import { NativeModule, requireNativeModule } from 'expo';

import { ExpoGeocodingModuleEvents } from './ExpoGeocoding.types';

declare class ExpoGeocodingModule extends NativeModule<ExpoGeocodingModuleEvents> {
  PI: number;
  hello(): string;
  setValueAsync(value: string): Promise<void>;
}

// This call loads the native module object from the JSI.
export default requireNativeModule<ExpoGeocodingModule>('ExpoGeocoding');
