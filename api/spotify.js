export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { trackId } = req.query;

  if (!trackId) {
    return res.status(400).json({ error: 'Track ID required' });
  }

  const CLIENT_ID = '72104d5a26c6488cb4f5062a1aeaecbd';
  const CLIENT_SECRET = '9cb3258647ad4b268638a4cb2033e7e5';

  try {
    // Get access token
    const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(CLIENT_ID + ':' + CLIENT_SECRET).toString('base64')
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenResponse.json();
    const token = tokenData.access_token;

    // Get track info
    const [trackInfo, audioFeatures] = await Promise.all([
      fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()),
      fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json())
    ]);

    // Try to get audio analysis
    let audioAnalysis = null;
    try {
      const analysisResponse = await fetch(`https://api.spotify.com/v1/audio-analysis/${trackId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (analysisResponse.ok) {
        audioAnalysis = await analysisResponse.json();
      }
    } catch (err) {
      console.log('Audio analysis not available');
    }

    return res.status(200).json({
      trackName: trackInfo.name,
      artist: trackInfo.artists[0].name,
      bpm: Math.round(audioFeatures.tempo),
      durationSeconds: Math.round(trackInfo.duration_ms / 1000),
      audioAnalysis: audioAnalysis
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch Spotify data',
      details: error.message 
    });
  }
}
