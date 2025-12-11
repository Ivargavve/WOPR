import { invoke } from '@tauri-apps/api/core';

/**
 * @typedef {'granted' | 'denied' | 'notdetermined' | 'restricted' | 'unknown'} PermissionState
 */

/**
 * @typedef {Object} PermissionStatus
 * @property {PermissionState} screen_recording
 * @property {PermissionState} microphone
 */

/**
 * Check all permission statuses
 * @returns {Promise<PermissionStatus>}
 */
export async function checkPermissions() {
  return await invoke('check_permissions');
}

/**
 * Check screen recording permission
 * @returns {Promise<PermissionState>}
 */
export async function checkScreenRecordingPermission() {
  return await invoke('check_screen_recording_permission');
}

/**
 * Check microphone permission
 * @returns {Promise<PermissionState>}
 */
export async function checkMicrophonePermission() {
  return await invoke('check_microphone_permission');
}

/**
 * Open system settings for screen recording permission
 * @returns {Promise<void>}
 */
export async function openScreenRecordingSettings() {
  return await invoke('open_screen_recording_settings');
}

/**
 * Open system settings for microphone permission
 * @returns {Promise<void>}
 */
export async function openMicrophoneSettings() {
  return await invoke('open_microphone_settings');
}

/**
 * Open general privacy settings
 * @returns {Promise<void>}
 */
export async function openPrivacySettings() {
  return await invoke('open_privacy_settings');
}

/**
 * Test if screen capture actually works
 * @returns {Promise<boolean>}
 */
export async function testScreenCapture() {
  return await invoke('test_screen_capture');
}

/**
 * Request microphone permission via browser API
 * Returns true if granted, false otherwise
 * @returns {Promise<boolean>}
 */
export async function requestMicrophonePermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just wanted to trigger the permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (e) {
    console.error('Microphone permission denied:', e);
    return false;
  }
}

/**
 * Check microphone permission via browser API
 * @returns {Promise<PermissionState>}
 */
export async function checkBrowserMicrophonePermission() {
  try {
    // @ts-ignore - permissions API
    const result = await navigator.permissions.query({ name: 'microphone' });
    switch (result.state) {
      case 'granted':
        return 'granted';
      case 'denied':
        return 'denied';
      case 'prompt':
        return 'notdetermined';
      default:
        return 'unknown';
    }
  } catch (e) {
    // Firefox doesn't support querying microphone permission
    return 'unknown';
  }
}
