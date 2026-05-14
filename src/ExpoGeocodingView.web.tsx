import * as React from 'react';

import { ExpoGeocodingViewProps } from './ExpoGeocoding.types';

export default function ExpoGeocodingView(props: ExpoGeocodingViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
