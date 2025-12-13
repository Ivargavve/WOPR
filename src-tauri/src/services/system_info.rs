use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use sysinfo::{Components, CpuRefreshKind, Disks, Networks, System};

/// Managed state for system monitoring
pub struct SystemMonitor {
    pub system: Mutex<System>,
    pub networks: Mutex<Networks>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        let mut sys = System::new_all();
        // Initial refresh to populate data
        sys.refresh_all();

        Self {
            system: Mutex::new(sys),
            networks: Mutex::new(Networks::new_with_refreshed_list()),
        }
    }
}

impl Default for SystemMonitor {
    fn default() -> Self {
        Self::new()
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub cpu_count: usize,
    pub memory_used: u64,
    pub memory_total: u64,
    pub memory_percent: f32,
    pub disk_used: u64,
    pub disk_total: u64,
    pub disk_percent: f32,
    pub temperature: Option<f32>,
    pub network_in: u64,
    pub network_out: u64,
    pub uptime_seconds: u64,
    pub processes: Vec<ProcessInfo>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu_usage: f32,
    pub memory_mb: f64,
    pub status: String,
}

#[tauri::command]
pub fn get_system_stats(state: tauri::State<SystemMonitor>) -> Result<SystemStats, String> {
    let mut sys = state.system.lock().map_err(|e| e.to_string())?;
    let mut networks = state.networks.lock().map_err(|e| e.to_string())?;

    // Refresh all metrics
    sys.refresh_cpu_specifics(CpuRefreshKind::everything());
    sys.refresh_memory();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    networks.refresh();

    // CPU usage (average across all cores)
    let cpu_usage: f32 = if sys.cpus().is_empty() {
        0.0
    } else {
        sys.cpus().iter().map(|cpu| cpu.cpu_usage()).sum::<f32>() / sys.cpus().len() as f32
    };

    // Memory
    let memory_used = sys.used_memory();
    let memory_total = sys.total_memory();
    let memory_percent = if memory_total > 0 {
        (memory_used as f64 / memory_total as f64 * 100.0) as f32
    } else {
        0.0
    };

    // Disk (aggregate all disks)
    let disks = Disks::new_with_refreshed_list();
    let (disk_used, disk_total) = disks.iter().fold((0u64, 0u64), |(used, total), disk| {
        (
            used + (disk.total_space() - disk.available_space()),
            total + disk.total_space(),
        )
    });
    let disk_percent = if disk_total > 0 {
        (disk_used as f64 / disk_total as f64 * 100.0) as f32
    } else {
        0.0
    };

    // Temperature (try to get CPU temp)
    let components = Components::new_with_refreshed_list();
    let temperature = components
        .iter()
        .find(|c| {
            let label = c.label().to_lowercase();
            label.contains("cpu") || label.contains("core") || label.contains("die")
        })
        .map(|c| c.temperature());

    // Network I/O (sum all interfaces)
    let (network_in, network_out) = networks.iter().fold((0u64, 0u64), |(rx, tx), (_, data)| {
        (rx + data.received(), tx + data.transmitted())
    });

    // System uptime
    let uptime_seconds = System::uptime();

    // Top processes by memory usage
    let mut processes: Vec<ProcessInfo> = sys
        .processes()
        .iter()
        .map(|(pid, process)| ProcessInfo {
            pid: pid.as_u32(),
            name: process.name().to_string_lossy().to_string(),
            cpu_usage: process.cpu_usage(),
            memory_mb: process.memory() as f64 / 1024.0 / 1024.0,
            status: format!("{:?}", process.status()),
        })
        .collect();

    // Sort by memory usage descending (more reliable than CPU for single snapshots)
    processes.sort_by(|a, b| {
        b.memory_mb
            .partial_cmp(&a.memory_mb)
            .unwrap_or(std::cmp::Ordering::Equal)
    });
    processes.truncate(30);

    Ok(SystemStats {
        cpu_usage,
        cpu_count: sys.cpus().len(),
        memory_used,
        memory_total,
        memory_percent,
        disk_used,
        disk_total,
        disk_percent,
        temperature,
        network_in,
        network_out,
        uptime_seconds,
        processes,
    })
}
