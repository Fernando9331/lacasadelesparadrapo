'use strict';

// Host fijo: ninguna petición del cliente decide a qué servidor se conecta el backend.
const MUX_API = 'https://api.mux.com';
const MUX_RTMP_URL = 'rtmps://global-live.mux.com:443/app';

function createMuxClient({ tokenId, tokenSecret, fetchImpl = fetch }) {
  const authorization = `Basic ${Buffer.from(`${tokenId}:${tokenSecret}`).toString('base64')}`;

  async function request(method, pathname, body) {
    if (!tokenId || !tokenSecret) {
      throw new Error('Credenciales de Mux no configuradas');
    }
    const response = await fetchImpl(new URL(pathname, MUX_API), {
      method,
      headers: { authorization, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) {
      throw new Error(`Mux respondió con estado ${response.status}`);
    }
    const payload = await response.json();
    return payload.data;
  }

  return {
    rtmpUrl: MUX_RTMP_URL,
    createLiveStream: () =>
      request('POST', '/video/v1/live-streams', {
        playback_policy: ['public'],
        new_asset_settings: { playback_policy: ['public'] },
        latency_mode: 'low',
      }),
    getLiveStream: (liveStreamId) =>
      request('GET', `/video/v1/live-streams/${encodeURIComponent(liveStreamId)}`),
  };
}

module.exports = { createMuxClient };
