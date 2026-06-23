use http::StatusCode;
use serde::Deserialize;

use crate::AppConfig;

pub async fn make_get_request<T: for<'a> Deserialize<'a>>(
    config: &AppConfig,
    endpoint: &str,
    params: serde_json::Value,
) -> Result<T, (u16, String)> {
    let params_obj = params.as_object().expect("params must be a JSON object");
    let mut params_query = Vec::new();
    for (key, value) in params_obj {
        if value.is_null() {
            continue;
        };
        match value {
            serde_json::Value::String(s) => params_query.push((key.clone(), s.clone())),
            serde_json::Value::Array(arr) => {
                for val in arr {
                    if let serde_json::Value::String(s) = val {
                        params_query.push((key.clone(), s.clone()))
                    } else if let serde_json::Value::Number(i) = val {
                        params_query.push((key.clone(), format!("{}", i)))
                    }
                }
            }
            serde_json::Value::Number(i) => params_query.push((key.clone(), format!("{}", i))),
            _ => {
                return Err((500, format!("Unsupported value type for key: {}", key)).into());
            }
        }
    }

    let url = format!("{}{endpoint}", &config.backend_url);
    log::info!("{url:?}");
    let response_unparsed = config
        .client
        .get(url)
        .query(&params_query)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", &config.bearer_token))
        .send()
        .await
        .map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                format!("Error occurred during request: {}", err),
            )
        })?;

    let response = response_unparsed.error_for_status().map_err(|err| {
        (
            err.status()
                .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
                .as_u16(),
            format!("Error occurred during request: {}", err.to_string()),
        )
    })?;

    // // Read body as text first
    // let body_text = response.text().await.map_err(|err| {
    //     (
    //         StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
    //         format!("Error reading body as text: {}", err),
    //     )
    // })?;
    //
    // // Log or print the body text for debugging
    // println!("Raw response body: {}", body_text);
    //
    // let result: T = serde_json::from_str(&body_text).map_err(|err| {
    //     (
    //         StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
    //         format!("Error during JSON deserialization: {}", err),
    //     )
    // })?;
    let result = response.json::<T>().await.map_err(|err| {
        // Ok(parsed) => tauri::ipc::Response::new(parsed),
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Error occurred during parsing of data: {}", err),
        )
    })?;

    Ok(result)
}

pub async fn make_post_request<T: for<'a> Deserialize<'a>>(
    config: &AppConfig,
    endpoint: &str,
    body: serde_json::Value,
) -> Result<T, (u16, String)> {
    // let params_obj = params.as_object().expect("params must be a JSON object");
    // let mut params_query = Vec::new();
    // for (key, value) in params_obj {
    //     if value.is_null() {
    //         continue;
    //     };
    //     match value {
    //         serde_json::Value::String(s) => params_query.push((key.clone(), s.clone())),
    //         serde_json::Value::Array(arr) => {
    //             for val in arr {
    //                 if let serde_json::Value::String(s) = val {
    //                     params_query.push((key.clone(), s.clone()))
    //                 } else if let serde_json::Value::Number(i) = val {
    //                     params_query.push((key.clone(), format!("{}", i)))
    //                 }
    //             }
    //         }
    //         serde_json::Value::Number(i) => params_query.push((key.clone(), format!("{}", i))),
    //         _ => {
    //             return Err((500, format!("Unsupported value type for key: {}", key)).into());
    //         }
    //     }
    // }

    let url = format!("{}{endpoint}", &config.backend_url);
    let response_unparsed = config
        .client
        .post(url)
        .json(&body)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", &config.bearer_token))
        .send()
        .await
        .map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                format!("Error occurred during request: {}", err),
            )
        })?;

    let response = response_unparsed.error_for_status().map_err(|err| {
        (
            err.status()
                .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
                .as_u16(),
            format!("Error occurred during request: {}", err.to_string()),
        )
    })?;

    let result = response.json::<T>().await.map_err(|err| {
        // Ok(parsed) => tauri::ipc::Response::new(parsed),
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Error occurred during parsing of data: {}", err),
        )
    })?;

    Ok(result)
}

pub async fn make_put_request<T: for<'a> Deserialize<'a>>(
    config: &AppConfig,
    endpoint: &str,
    body: serde_json::Value,
) -> Result<T, (u16, String)> {
    let url = format!("{}{endpoint}", &config.backend_url);
    let response_unparsed = config
        .client
        .put(url)
        .json(&body)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", &config.bearer_token))
        .send()
        .await
        .map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                format!("Error occurred during request: {}", err),
            )
        })?;

    let response = response_unparsed.error_for_status().map_err(|err| {
        (
            err.status()
                .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
                .as_u16(),
            format!("Error occurred during request: {}", err.to_string()),
        )
    })?;

    let result = response.json::<T>().await.map_err(|err| {
        // Ok(parsed) => tauri::ipc::Response::new(parsed),
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Error occurred during parsing of data: {}", err),
        )
    })?;

    Ok(result)
}

pub async fn make_patch_request<T: for<'a> Deserialize<'a>>(
    config: &AppConfig,
    endpoint: &str,
    body: serde_json::Value,
) -> Result<T, (u16, String)> {
    let url = format!("{}{endpoint}", &config.backend_url);
    let response_unparsed = config
        .client
        .patch(url)
        .json(&body)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", &config.bearer_token))
        .send()
        .await
        .map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                format!("Error occurred during request: {}", err),
            )
        })?;

    let response = response_unparsed.error_for_status().map_err(|err| {
        (
            err.status()
                .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
                .as_u16(),
            format!("Error occurred during request: {}", err.to_string()),
        )
    })?;

    let result = response.json::<T>().await.map_err(|err| {
        // Ok(parsed) => tauri::ipc::Response::new(parsed),
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Error occurred during parsing of data: {}", err),
        )
    })?;

    Ok(result)
}
