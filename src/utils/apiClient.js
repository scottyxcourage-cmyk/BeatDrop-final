const { execFile } = require('child_process');
const path = require('path');

const YTDLP_PATH = 'yt-dlp';
const SEARCH_TIMEOUT = 30000;
const DOWNLOAD_TIMEOUT = 45000;

function execYtDlp(args, timeout = SEARCH_TIMEOUT) {
  return new Promise((resolve, reject) => {
    execFile(YTDLP_PATH, args, { timeout, maxBuffer: 5 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(err.message || 'yt-dlp command failed'));
        return;
      }
      resolve(stdout.trim());
    });
  });
}

async function searchYouTube(query, limit = 6) {
  const searchTerm = `ytsearch${limit}:${query}`;
  const args = [
    searchTerm,
    '--flat-playlist',
    '--dump-json',
    '--no-warnings',
    '--ignore-errors'
  ];

  const output = await execYtDlp(args);
  const lines = output.split('\n').filter(line => line.trim());

  const results = [];
  for (const line of lines) {
    try {
      const data = JSON.parse(line);
      results.push({
        title: data.title || 'Unknown',
        channel: data.channel || data.uploader || 'Unknown',
        thumbnail: data.thumbnail || `https://i.ytimg.com/vi/${data.id}/hqdefault.jpg`,
        duration: data.duration ? formatDuration(data.duration) : '',
        quality: '320kbps',
        url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
        videoId: data.id,
        views: data.view_count || 0
      });
    } catch (e) {
      // Skip unparseable lines
    }
  }

  return results;
}

async function getDownloadInfo(videoUrl) {
  const args = [
    videoUrl,
    '-f', 'bestaudio[ext=m4a]/bestaudio',
    '--get-url',
    '--get-title',
    '--get-thumbnail',
    '--get-duration',
    '--no-warnings',
    '--no-playlist'
  ];

  const output = await execYtDlp(args, DOWNLOAD_TIMEOUT);
  const lines = output.split('\n').filter(line => line.trim());

  if (lines.length < 4) {
    throw new Error('Could not extract download info');
  }

  const title = lines[0];
  const downloadUrl = lines[1];
  const thumbnail = lines[2];
  const duration = lines[3];

  // Parse artist from title (format: "Artist - Song Title")
  let artist = 'Unknown';
  let songTitle = title;
  if (title.includes(' - ')) {
    const parts = title.split(' - ');
    artist = parts[0].trim();
    songTitle = parts.slice(1).join(' - ').trim();
  }

  return {
    status: true,
    result: {
      title: songTitle,
      channel: artist,
      thumbnail,
      duration,
      quality: '320kbps',
      dl: downloadUrl,
      url: videoUrl
    }
  };
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

module.exports = { searchYouTube, getDownloadInfo };
