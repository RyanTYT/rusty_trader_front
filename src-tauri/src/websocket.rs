use std::{iter::successors, sync::Arc, time::Duration};

use chrono::Utc;
use futures_util::StreamExt;
use tauri::Emitter;
use tokio::sync::mpsc::Receiver;

use crate::AppConfig;

// #[tauri::command]
pub async fn create_websocket_connection<'a>(
    app_handle: tauri::AppHandle,
    config: &AppConfig,
    mut refresh_rcx: Receiver<()>,
) -> Result<(), (u16, String)> {
    let url = format!("{}/ws?token={}", &config.backend_url, &config.bearer_token)
        .replace("http://", "ws://");
    log::info!("Websocket URL: {url:?}");

    // 30s intervals
    let fib_generator_from_beginning_state = successors(Some((0u64, 1u64)), move |&(a, b)| {
        a.checked_add(b).map(|next| (b, next))
    });
    let mut fib_generator = fib_generator_from_beginning_state.clone();

    loop {
        match tokio_tungstenite::connect_async(&url).await {
            Ok((ws_stream, _)) => {
                // Reset generator on success
                fib_generator = fib_generator_from_beginning_state.clone();
                {
                    let mut ws_health = config.ws_health.lock().await;
                    ws_health.replace(true);
                }
                if let Err(e) = app_handle.emit("ws-status", (200, format!("Connected"))) {
                    log::error!("Failed to emit ws-status Connected event: {e:?}");
                };
                let (mut _write, mut read) = ws_stream.split();
                log::info!("Backend Websocket successfully established!");

                let mut interval = tokio::time::interval(Duration::from_secs(60));
                let mut last_ping = Utc::now();

                loop {
                    tokio::select! {
                        // Heartbeat check
                        _ = interval.tick() => {
                            let now = Utc::now();
                            if (now - last_ping).num_seconds() > 30 * 4 {
                                log::warn!("Websocket heartbeat failed! Reconnecting...");
                                break;
                            }
                        }

                        // WebSocket stream handling
                        res = read.next() => {
                            match res {
                                Some(Ok(message)) => {
                                    // CRITICAL: Update last_ping whenever we get ANY valid communication
                                    last_ping = Utc::now();

                                    if message.is_ping() {
                                        continue;
                                    }

                                    let text = match message.to_text() {
                                        Ok(t) => t,
                                        Err(_) => {
                                            log::error!("Received non-utf8 data");
                                            continue;
                                        }
                                    };

                                    if let Err(e) = app_handle.emit("ws-event", serde_json::json!(text)) {
                                        log::error!("Failed to emit ws-event: {e:?}");
                                    }
                                }
                                Some(Err(e)) => {
                                    let _ = app_handle.emit("ws-status", (500, format!("Stream Error: {e:?}")));
                                    break;
                                }
                                None => {
                                    log::info!("Stream closed by server");
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            Err(e) => {
                // Log error and notify UI
                log::error!("tokio_tungstenite failed: {e:?}");
                {
                    let mut ws_health = config.ws_health.lock().await;
                    ws_health.replace(false);
                }
                if let Err(e) = app_handle.emit("ws-status", (500, format!("Offline: {e:?}"))) {
                    log::error!("Failed to emit ws-status Offline event: {e:?}");
                };
            }
        }

        tokio::select! {
            _ = refresh_rcx.recv() => {fib_generator = fib_generator_from_beginning_state.clone();}
            _ = tokio::time::sleep(Duration::from_secs(fib_generator.next().unwrap().1)) => {}
        }
    }
}
