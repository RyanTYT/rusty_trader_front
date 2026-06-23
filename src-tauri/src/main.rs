// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// mod websocket;
// mod request_handlers;
// mod news_ideas;

fn main() {
    autotrader_lib::run()
}
