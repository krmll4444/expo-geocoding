import { registerWebModule, NativeModule } from 'expo';

import { ExpoGeocodingModuleEvents } from './ExpoGeocoding.types';

class ExpoGeocodingModule extends NativeModule<ExpoGeocodingModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
}

export default registerWebModule(ExpoGeocodingModule, 'ExpoGeocodingModule');
