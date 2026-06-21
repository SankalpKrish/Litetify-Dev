use std::sync::mpsc;
use std::thread;
use std::time::Duration;
use tiny_http::{Response, Server};

pub struct CallbackResult {
    pub code: String,
    pub state: String,
}

const HTML_SUCCESS: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Litetify — Authentication complete</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0d0d0f;color:#f5f5f7;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
    .card{text-align:center;padding:3rem 2rem;max-width:380px;width:100%}
    .icon-wrap{width:64px;height:64px;border-radius:50%;background:rgba(29,185,84,0.15);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem}
    .check{font-size:1.75rem;color:#1db954;line-height:1}
    .logo{width:32px;height:32px;background:#1db954;border-radius:4px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-weight:700;font-size:14px;color:#000}
    h1{margin:0 0 0.5rem;font-size:1.25rem;font-weight:600;letter-spacing:-0.02em}
    p{margin:0;font-size:0.85rem;color:#9b9ba3;line-height:1.5}
    .spinner{width:20px;height:20px;border:2px solid rgba(255,255,255,0.06);border-top-color:#1db954;border-radius:50%;animation:spin 0.8s linear infinite;margin:1.5rem auto 0}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">L</div>
    <div class="icon-wrap"><span class="check">&#10003;</span></div>
    <h1>Authentication complete</h1>
    <p>You can close this tab and return to Litetify.</p>
    <div class="spinner"></div>
  </div>
</body>
</html>"#;

const HTML_ERROR: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Litetify — Authentication failed</title>
  <style>
    *,*::before,*::after{box-sizing:border-box}
    body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#0d0d0f;color:#f5f5f7;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-font-smoothing:antialiased}
    .card{text-align:center;padding:3rem 2rem;max-width:380px;width:100%}
    .logo{width:32px;height:32px;background:#1db954;border-radius:4px;display:flex;align-items:center;justify-content:center;margin:0 auto 1.25rem;font-weight:700;font-size:14px;color:#000}
    .icon-wrap{width:64px;height:64px;border-radius:50%;background:rgba(231,76,60,0.1);display:flex;align-items:center;justify-content:center;margin:0 auto 1.5rem}
    .error-x{font-size:1.5rem;color:#e74c3c;line-height:1}
    h1{margin:0 0 0.5rem;font-size:1.25rem;font-weight:600;letter-spacing:-0.02em}
    p{margin:0;font-size:0.85rem;color:#9b9ba3;line-height:1.5}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">L</div>
    <div class="icon-wrap"><span class="error-x">&#10007;</span></div>
    <h1>Authentication failed</h1>
    <p>Please try logging in again.</p>
  </div>
</body>
</html>"#;

pub struct CallbackServer {
    pub port: u16,
    pub receiver: mpsc::Receiver<CallbackResult>,
    handle: Option<thread::JoinHandle<()>>,
}

impl CallbackServer {
    pub fn start(
        port: u16,
        expected_state: String,
    ) -> Result<Self, String> {
        let addr = format!("127.0.0.1:{port}");
        let server = Server::http(&addr).map_err(|e| format!("server bind error: {e}"))?;
        let actual_port = server
            .server_addr()
            .to_ip()
            .ok_or("failed to resolve server address")?
            .port();

        let (tx, receiver) = mpsc::channel();

        let handle = thread::spawn(move || {
            if let Some(request) = server.incoming_requests().next() {
                let url = request.url();
                let response = Self::handle_request(url, &expected_state, &tx);

                let status = match &response {
                    Ok(_) => 200,
                    Err(code) => *code,
                };
                let body = match response {
                    Ok(_) | Err(400) | Err(403) => {
                        if response.is_ok() {
                            HTML_SUCCESS
                        } else {
                            HTML_ERROR
                        }
                    }
                    _ => HTML_ERROR,
                };

                let resp = Response::from_string(body).with_status_code(status);
                let _ = request.respond(resp);
            }
        });

        Ok(Self {
            port: actual_port,
            receiver,
            handle: Some(handle),
        })
    }

    fn handle_request(
        url: &str,
        expected_state: &str,
        tx: &mpsc::Sender<CallbackResult>,
    ) -> Result<(), i32> {
        let parsed = match url::Url::parse(&format!("http://127.0.0.1{url}")) {
            Ok(u) => u,
            Err(_) => return Err(400),
        };

        if parsed.query_pairs().find(|(k, _)| k == "error").is_some() {
            return Err(400);
        }

        let code = parsed
            .query_pairs()
            .find(|(k, _)| k == "code")
            .map(|(_, v)| v.to_string());

        let state = parsed
            .query_pairs()
            .find(|(k, _)| k == "state")
            .map(|(_, v)| v.to_string());

        match (code, state) {
            (Some(code_val), Some(state_val)) if state_val == expected_state => {
                let _ = tx.send(CallbackResult {
                    code: code_val,
                    state: state_val,
                });
                Ok(())
            }
            (Some(_), Some(_)) => Err(403),
            _ => Err(400),
        }
    }
}

impl Drop for CallbackServer {
    fn drop(&mut self) {
        if let Some(handle) = self.handle.take() {
            let timeout = Duration::from_secs(5);
            let start = std::time::Instant::now();
            while start.elapsed() < timeout {
                if handle.is_finished() {
                    let _ = handle.join();
                    return;
                }
                std::thread::sleep(Duration::from_millis(100));
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::{Read, Write};
    use std::net::TcpStream;
    use std::time::Duration;

    fn make_request(port: u16, path: &str) -> String {
        let addr = format!("127.0.0.1:{port}");
        let mut stream = TcpStream::connect_timeout(
            &addr.parse().unwrap(),
            Duration::from_secs(2),
        )
        .unwrap();
        let req = format!("GET {path} HTTP/1.1\r\nHost: 127.0.0.1:{port}\r\nConnection: close\r\n\r\n");
        stream.write_all(req.as_bytes()).unwrap();
        let mut buf = String::new();
        stream.read_to_string(&mut buf).unwrap();
        buf
    }

    #[test]
    fn test_server_captures_code() {
        let server = CallbackServer::start(0, "test-state".into()).unwrap();
        let resp = make_request(
            server.port,
            "/callback?code=abc123&state=test-state",
        );
        assert!(resp.contains("200"), "expected 200, got: {resp}");
        let result = server.receiver.recv_timeout(Duration::from_secs(2)).unwrap();
        assert_eq!(result.code, "abc123");
    }

    #[test]
    fn test_server_rejects_wrong_state() {
        let server = CallbackServer::start(0, "expected-state".into()).unwrap();
        let resp = make_request(
            server.port,
            "/callback?code=abc123&state=wrong-state",
        );
        assert!(resp.contains("403") || resp.contains("400"), "expected 4xx, got: {resp}");
    }

    #[test]
    fn test_server_rejects_missing_params() {
        let server = CallbackServer::start(0, "state".into()).unwrap();
        let resp = make_request(server.port, "/callback");
        assert!(resp.contains("400"), "expected 400, got: {resp}");
    }

    #[test]
    fn test_server_rejects_error_param() {
        let server = CallbackServer::start(0, "state".into()).unwrap();
        let resp = make_request(
            server.port,
            "/callback?error=access_denied&state=state",
        );
        assert!(resp.contains("400"), "expected 400, got: {resp}");
    }
}
