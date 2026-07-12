import importlib
import sys

from fastapi.testclient import TestClient


def load_server(monkeypatch, mongo_url=None, db_name=None):
    if mongo_url is None:
        monkeypatch.delenv("MONGO_URL", raising=False)
    else:
        monkeypatch.setenv("MONGO_URL", mongo_url)

    if db_name is None:
        monkeypatch.delenv("DB_NAME", raising=False)
    else:
        monkeypatch.setenv("DB_NAME", db_name)

    sys.modules.pop("server", None)
    return importlib.import_module("server")


def test_healthz_imports_without_database_env(monkeypatch):
    server = load_server(monkeypatch)
    client = TestClient(server.app)

    assert client.get("/api/healthz").json() == {"status": "ok"}
    assert client.get("/api/readyz").json() == {
        "status": "degraded",
        "database": "not_configured",
    }


def test_status_fails_closed_without_database_env(monkeypatch):
    server = load_server(monkeypatch)
    client = TestClient(server.app)

    response = client.get("/api/status")

    assert response.status_code == 503
    assert response.json()["detail"] == "Database is not configured. Set MONGO_URL and DB_NAME."


def test_cors_credentials_disabled_for_wildcard_default(monkeypatch):
    server = load_server(monkeypatch)
    client = TestClient(server.app)

    response = client.options(
        "/api/healthz",
        headers={
            "origin": "https://example.com",
            "access-control-request-method": "GET",
        },
    )

    assert response.headers["access-control-allow-origin"] == "*"
    assert "access-control-allow-credentials" not in response.headers
