/**
 * Microphone Service
 * Provides cross-platform microphone device enumeration and selection
 */

/**
 * @typedef {Object} MicrophoneDevice
 * @property {string} deviceId - Unique device ID
 * @property {string} label - Human-readable device name
 * @property {boolean} isDefault - Whether this is the default device
 */

/**
 * Get list of available audio input devices (microphones)
 * Works on both Windows and macOS via browser MediaDevices API
 * @returns {Promise<MicrophoneDevice[]>}
 */
export async function getAvailableMicrophones() {
  try {
    // First, we need to request permission to access audio devices
    // This is required to get device labels on most browsers
    let hasPermission = false;

    try {
      // Try to get a brief audio stream to trigger permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      hasPermission = true;
    } catch (e) {
      console.warn('Could not get microphone permission for enumeration:', e);
      // Continue anyway - we might get devices without labels
    }

    // Enumerate all media devices
    const devices = await navigator.mediaDevices.enumerateDevices();

    // Filter to only audio input devices (microphones)
    const microphones = devices
      .filter(device => device.kind === 'audioinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `Microphone ${index + 1}`,
        isDefault: device.deviceId === 'default' || index === 0
      }));

    return microphones;
  } catch (e) {
    console.error('Failed to enumerate microphones:', e);
    return [];
  }
}

/**
 * Check if the browser supports mediaDevices API
 * @returns {boolean}
 */
export function isMediaDevicesSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices);
}

/**
 * Get audio stream from a specific microphone
 * @param {string | null} deviceId - Device ID to use (null for default)
 * @returns {Promise<MediaStream>}
 */
export async function getMicrophoneStream(deviceId = null) {
  const constraints = {
    audio: deviceId ? { deviceId: { exact: deviceId } } : true
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}

/**
 * Test if a specific microphone works
 * @param {string | null} deviceId - Device ID to test (null for default)
 * @returns {Promise<boolean>}
 */
export async function testMicrophone(deviceId = null) {
  try {
    const stream = await getMicrophoneStream(deviceId);
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (e) {
    console.error('Microphone test failed:', e);
    return false;
  }
}
