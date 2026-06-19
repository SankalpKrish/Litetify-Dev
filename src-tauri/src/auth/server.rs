use std::sync::mpsc;
use std::thread;
use tiny_http::{Response, Server};

pub struct CallbackResult {
    pub code: String,
    pub state: String,
}

const HTML_SUCCESS: &str = r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Litetify — Auth</title>
  <style>
    body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#0d0d0f;color:#f5f5f7}
    .card{text-align:center;padding:2rem}
    .check{font-size:3rem;color:#1db954;margin-bottom:0.5rem}
    p{margin:0;font-size:1.1rem}
    .sub{color:#9b9ba3;font-size:0.85rem;margin-top:0.5rem}
  </style>
</head>
<body>
  <div class="card">
    <div class="check">&#10003;</div>
    <p>Authentication complete!</p>
    <p class="sub">You can close this tab and return to Litetify.</p>
  </div>
</body>
</html>"#;

const HTML_ERROR: &str = r#"<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Litetify — Auth Error</title>
<style>body{display:flex;justify-content:center;align-items:center;height:100vh;margin:0;font-family:sans-serif;background:#0d0d0f;color:#f5f5f7}
.card{text-align:center;padding:2rem}
.error{font-size:2rem;color:#e74c3c;margin-bottom:0.5rem}
p{margin:0}</style></head>
<body>
  <div class="card">
    <div class="error">&#10007;</div>
    <p>Authentication failed.</p>
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

        if let Some(err) = parsed.query_pairs().find(|(k, _)| k == "error") {
            let _ = err;
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
            let _ = handle.join();
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
