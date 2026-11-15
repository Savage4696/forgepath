import { API_BASE } from './client.js';

const CACHE_KEY = 'forgepath:perseverance:photos';
const CACHE_TTL = 1000 * 60 * 15;

export const fallbackMission = {
  rover: 'Perseverance Rover', camera: 'Mast Camera (Mastcam-Z)', sol: 1284,
  earthDate: '2024-10-08',
  imgSrc: 'https://images-assets.nasa.gov/image/PIA24320/PIA24320~medium.jpg',
  status: 'NASA ARCHIVE STREAM',
  text: 'Official NASA Mars 2020 Perseverance surface imagery from Jezero Crater.'
};

// NASA's public endpoint is not a live video stream; sol is the stable mission coordinate.
export async function getLatestRoverPhoto({ rover = 'perseverance', sol = 1284 } = {}) {
  const cached = readCache();
  if (cached) return { ...cached, status: 'CACHED STREAM' };
  try {
    const response = await fetch(`${API_BASE}/api/mars/photos?rover=${rover}&sol=${sol}`);
    if (!response.ok) throw new Error(`NASA API responded with ${response.status}`);
    const photo = (await response.json()).photos?.[0];
    if (!photo || !photo.img_src) throw new Error('No rover image returned for this sol');
    const mission = { rover: photo.rover.name, camera: photo.camera.full_name, sol: photo.sol,
      earthDate: photo.earth_date, imgSrc: photo.img_src, status: 'NASA STREAM',
      text: `Captured by ${photo.camera.full_name} during Sol ${photo.sol}.` };
    writeCache(mission);
    return mission;
  } catch (error) {
    console.warn('[Forgepath] NASA photo stream unavailable:', error.message);
    return fallbackMission;
  }
}
function readCache() { try { const item = JSON.parse(localStorage.getItem(CACHE_KEY)); return item && Date.now() - item.cachedAt < CACHE_TTL ? item.data : null; } catch { return null; } }
function writeCache(data) { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ cachedAt: Date.now(), data })); } catch { /* private mode */ } }
