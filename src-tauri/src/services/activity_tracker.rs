use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

/// Managed state for activity tracking
pub struct ActivityTracker {
    pub data: Mutex<ActivityData>,
    pub data_path: Mutex<PathBuf>,
    pub last_app: Mutex<Option<String>>,
    pub last_check: Mutex<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ActivityData {
    /// App name -> seconds spent today
    pub today: HashMap<String, u64>,
    /// App name -> total seconds all time
    pub all_time: HashMap<String, u64>,
    /// App name -> last seen timestamp (unix seconds)
    #[serde(default)]
    pub last_seen: HashMap<String, u64>,
    /// Session start timestamp
    pub session_start: u64,
    /// Total seconds tracked today
    pub total_today: u64,
    /// Date string for today (to detect day change)
    pub today_date: String,
    /// History: date -> app -> seconds
    pub history: HashMap<String, HashMap<String, u64>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ActivityStats {
    pub today: Vec<AppUsage>,
    pub all_time: Vec<AppUsage>,
    pub session_duration: u64,
    pub total_today: u64,
    pub current_app: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AppUsage {
    pub name: String,
    pub seconds: u64,
    pub percent: f32,
    /// Last seen timestamp (unix seconds)
    pub last_seen: u64,
}

impl ActivityTracker {
    pub fn new(data_dir: PathBuf) -> Self {
        let data_path = data_dir.join("activity_data.json");
        let data = Self::load_data(&data_path).unwrap_or_default();

        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();

        Self {
            data: Mutex::new(data),
            data_path: Mutex::new(data_path),
            last_app: Mutex::new(None),
            last_check: Mutex::new(now),
        }
    }

    fn load_data(path: &PathBuf) -> Option<ActivityData> {
        if path.exists() {
            let content = fs::read_to_string(path).ok()?;
            serde_json::from_str(&content).ok()
        } else {
            None
        }
    }

    fn save_data(&self) -> Result<(), String> {
        let data = self.data.lock().map_err(|e| e.to_string())?;
        let path = self.data_path.lock().map_err(|e| e.to_string())?;

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let json = serde_json::to_string_pretty(&*data).map_err(|e| e.to_string())?;
        fs::write(&*path, json).map_err(|e| e.to_string())?;
        Ok(())
    }
}

impl Default for ActivityTracker {
    fn default() -> Self {
        Self::new(PathBuf::from("."))
    }
}

/// Get the currently active/focused application name (macOS)
#[cfg(target_os = "macos")]
fn get_active_app() -> Option<String> {
    use std::process::Command;

    // Use AppleScript to get the frontmost app
    let output = Command::new("osascript")
        .args(["-e", "tell application \"System Events\" to get name of first application process whose frontmost is true"])
        .output()
        .ok()?;

    if output.status.success() {
        let name = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !name.is_empty() {
            return Some(name);
        }
    }
    None
}

#[cfg(target_os = "windows")]
fn get_active_app() -> Option<String> {
    // Windows implementation would use GetForegroundWindow + GetWindowText
    // For now, return None - can be implemented later
    None
}

#[cfg(target_os = "linux")]
fn get_active_app() -> Option<String> {
    // Linux implementation would use xdotool or similar
    // For now, return None - can be implemented later
    None
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn get_active_app() -> Option<String> {
    None
}

fn get_today_date() -> String {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    // Simple date calculation (not timezone aware, but good enough)
    let days = now / 86400;
    format!("{}", days)
}

#[tauri::command]
pub fn track_activity(state: tauri::State<ActivityTracker>) -> Result<Option<String>, String> {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    let current_app = get_active_app();
    let today = get_today_date();

    let mut data = state.data.lock().map_err(|e| e.to_string())?;
    let mut last_app = state.last_app.lock().map_err(|e| e.to_string())?;
    let mut last_check = state.last_check.lock().map_err(|e| e.to_string())?;

    // Check for day change
    if data.today_date != today {
        // Save yesterday's data to history
        if !data.today_date.is_empty() {
            let old_date = data.today_date.clone();
            let old_today = data.today.clone();
            data.history.insert(old_date, old_today);
        }
        // Reset today's data
        data.today.clear();
        data.total_today = 0;
        data.today_date = today;
        data.session_start = now;
    }

    // Initialize session start if needed
    if data.session_start == 0 {
        data.session_start = now;
    }

    // Calculate time elapsed since last check
    let elapsed = now.saturating_sub(*last_check);
    *last_check = now;

    // Only count reasonable intervals (max 90 seconds to account for 60s tracking interval + buffer)
    let counted_time = elapsed.min(90);

    if let Some(ref app) = current_app {
        // Add time to current app
        *data.today.entry(app.clone()).or_insert(0) += counted_time;
        *data.all_time.entry(app.clone()).or_insert(0) += counted_time;
        data.total_today += counted_time;

        // Record last seen timestamp
        data.last_seen.insert(app.clone(), now);

        // Track current app
        *last_app = Some(app.clone());
    }

    // Save periodically (every track call)
    drop(data);
    drop(last_app);
    drop(last_check);
    let _ = state.save_data();

    Ok(current_app)
}

#[tauri::command]
pub fn get_activity_stats(state: tauri::State<ActivityTracker>) -> Result<ActivityStats, String> {
    let data = state.data.lock().map_err(|e| e.to_string())?;
    let last_app = state.last_app.lock().map_err(|e| e.to_string())?;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();

    // Sort today's apps by usage
    let mut today_vec: Vec<_> = data.today.iter().collect();
    today_vec.sort_by(|a, b| b.1.cmp(a.1));

    let total_today = data.total_today.max(1);
    let today: Vec<AppUsage> = today_vec
        .into_iter()
        .take(20)
        .map(|(name, &seconds)| AppUsage {
            name: name.clone(),
            seconds,
            percent: (seconds as f32 / total_today as f32) * 100.0,
            last_seen: *data.last_seen.get(name).unwrap_or(&0),
        })
        .collect();

    // Sort all-time apps by usage
    let mut alltime_vec: Vec<_> = data.all_time.iter().collect();
    alltime_vec.sort_by(|a, b| b.1.cmp(a.1));

    let total_alltime: u64 = data.all_time.values().sum::<u64>().max(1);
    let all_time: Vec<AppUsage> = alltime_vec
        .into_iter()
        .take(20)
        .map(|(name, &seconds)| AppUsage {
            name: name.clone(),
            seconds,
            percent: (seconds as f32 / total_alltime as f32) * 100.0,
            last_seen: *data.last_seen.get(name).unwrap_or(&0),
        })
        .collect();

    let session_duration = now.saturating_sub(data.session_start);

    Ok(ActivityStats {
        today,
        all_time,
        session_duration,
        total_today: data.total_today,
        current_app: last_app.clone(),
    })
}

#[tauri::command]
pub fn reset_activity_today(state: tauri::State<ActivityTracker>) -> Result<(), String> {
    let mut data = state.data.lock().map_err(|e| e.to_string())?;

    // Save to history before clearing
    if !data.today_date.is_empty() {
        let old_date = data.today_date.clone();
        let old_today = data.today.clone();
        data.history.insert(old_date, old_today);
    }

    data.today.clear();
    data.total_today = 0;

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs();
    data.session_start = now;

    drop(data);
    state.save_data()
}
