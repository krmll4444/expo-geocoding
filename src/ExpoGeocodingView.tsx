import { requireNativeView } from 'expo';
import * as React from 'react';

import { ExpoGeocodingViewProps } from './ExpoGeocoding.types';

const NativeView: React.ComponentType<ExpoGeocodingViewProps> =
  requireNativeView('ExpoGeocoding');

export default function ExpoGeocodingView(props: ExpoGeocodingViewProps) {
  return <NativeView {...props} />;
}
