import { useEffect, useRef, useState } from "react";
import { CityEngine, type Selection, type Stats } from "../rendering/engine";
import { createState, type GameState } from "../core/state";
import { loadGame, resetGame, saveGame } from "../persistence/storage";
import type { Quality } from "../core/config";
import { SERVICES, type ServiceKind } from "../services/catalog";
function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    city: "M3 21V9h6v12M9 21V3h7v18M16 21V12h5v9M1 21h22M5 12h1m-1 4h1m6-9h1m-1 4h1m-1 4h1m6 1h1",
    grid: "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18",
    save: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12l4 4v12a2 2 0 0 1-2 2ZM7 3v6h10V3M7 21v-8h10v8",
    camera: "M4 8h4l2-3h4l2 3h4v12H4zM16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    settings: "M4 6h16M4 12h16M4 18h16M8 3v6M16 9v6M10 15v6",
    tree: "m12 2-7 9h4l-5 7h7v4h2v-4h7l-5-7h4z",
    clock: "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0M12 6v6l4 2",
    arrow: "M7 17 17 7M7 7h10v10",
    reset: "M3 10a9 9 0 1 1 1 8M3 3v7h7",
    close: "m6 6 12 12M6 18 18 6",
    sun: "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2",
    pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.city} />
    </svg>
  );
}
export function App() {
  const host = useRef<HTMLDivElement>(null),
    engine = useRef<CityEngine | null>(null);
  const [state, setState] = useState<GameState | null>(null),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  const [notice, setNotice] = useState(""),
    [selected, setSelected] = useState<Selection | null>(null);
  const [stats, setStats] = useState<Stats>({
    fps: 0,
    calls: 0,
    triangles: 0,
    camera: "",
    chunks: 0,
    chunkCenter: "",
    revision: 0,
    buildings: 0,
    crossings: 0,
    lamps: 0,
  });
  const [settings, setSettings] = useState(false),
    [resetConfirm, setResetConfirm] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    loadGame()
      .then((s) => {
        if (active) setState(s);
      })
      .catch((e) => {
        if (active) {
          setError(
            `Không tải được bản lưu: ${e.message} Bản lưu gốc chưa bị ghi đè. Bạn có thể xem thành phố mẫu hoặc chủ động đặt lại dữ liệu.`,
          );
          setState(createState());
        }
      });
    return () => {
      active = false;
    };
  }, []);
  const initialized = !!state;
  useEffect(() => {
    if (!initialized || !host.current || !state) return;
    let active = true;
    let instance: CityEngine;
    try {
      instance = new CityEngine(host.current, state, setStats, setSelected);
      engine.current = instance;
      instance
        .load()
        .then(() => {
          if (active) setReady(true);
        })
        .catch((e) => {
          if (active) setError(e.message);
        });
    } catch (e) {
      setError(
        `Không khởi tạo được WebGL: ${e instanceof Error ? e.message : String(e)}. Hãy bật tăng tốc đồ họa trong trình duyệt.`,
      );
      return;
    }
    return () => {
      active = false;
      instance.dispose();
      engine.current = null;
    };
    // State is sent through explicit commands, not scene reconstruction.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  function grid() {
    if (!state) return;
    const value = !state.grid;
    setState({ ...state, grid: value });
    engine.current?.setGrid(value);
  }
  function quality(value: Quality) {
    if (!state) return;
    setState({ ...state, quality: value });
    engine.current?.setQuality(value);
  }
  async function save() {
    if (!state) return;
    setBusy(true);
    try {
      await saveGame(state);
      setError("");
      setNotice("Đã lưu thành phố trên thiết bị này.");
    } catch (e) {
      setError(`Không lưu được: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }
  async function reset() {
    setBusy(true);
    try {
      const fresh = await resetGame();
      setState(fresh);
      engine.current?.setBuildings(fresh);
      engine.current?.setGrid(fresh.grid);
      engine.current?.setQuality(fresh.quality);
      engine.current?.resetCamera();
      engine.current?.clearSelection();
      setSelected(null);
      setError("");
      setNotice("Đã khôi phục thành phố mẫu.");
      setResetConfirm(false);
    } catch {
      setError("Không thể đặt lại dữ liệu. Bản lưu hiện tại được giữ lại.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app">
      <aside className="rail">
        <a className="brand-mark" href="#" aria-label="Focus City">
          <Icon name="city" size={27} />
        </a>
        <div className="rail-divider" />
        <button
          className="rail-button active"
          aria-label="Thành phố"
          title="Thành phố"
        >
          <Icon name="city" />
        </button>
        <button
          className={`rail-button ${settings ? "active" : ""}`}
          onClick={() => setSettings(!settings)}
          aria-label="Tùy chọn"
          title="Tùy chọn"
        >
          <Icon name="settings" />
        </button>
        <div className="rail-bottom">
          <span className="avatar">FC</span>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="wordmark">
            FOCUS<span>CITY</span>
            <span className="phase-badge">THÀNH PHỐ MỞ</span>
          </div>
          <div className="top-right">
            <span className="local-tag">
              <i /> Lưu trên thiết bị
            </span>
            <button
              className="save-button"
              onClick={save}
              disabled={!ready || busy}
            >
              <Icon name="save" size={16} />
              {busy ? "Đang xử lý…" : "Lưu thành phố"}
            </button>
          </div>
        </header>
        <section className="viewport" aria-label="Không gian thành phố">
          <div ref={host} className="canvas-host" data-testid="scene-host" />
          <div className="intro">
            <div className="eyebrow">
              <span /> THỐNG NHẤT · MỘT THÀNH PHỐ ĐANG LỚN
            </div>
            <h1>
              Thành phố,
              <br />
              không ngừng lớn.
            </h1>
            <p>Từ một đại lộ, kết nối những khu phố.</p>
            <div className="city-label">
              <Icon name="pin" size={15} /> Trung tâm Thống Nhất{" "}
              <span>64 × 64 ô lõi · Mở rộng theo camera</span>
            </div>
            <button
              className="explore-link"
              disabled={!ready}
              onClick={() => engine.current?.exploreEast()}
            >
              Khám phá phía Đông <Icon name="arrow" size={13} />
            </button>
          </div>
          <div className="weather">
            <Icon name="sun" size={20} />
            <div>
              Ban ngày<small>Ánh sáng tự nhiên</small>
            </div>
          </div>
          {!ready && !error && (
            <div className="loading" role="status">
              <span className="spinner" /> Đang dựng thành phố…
            </div>
          )}
          <div className="scene-caption">
            <span className="live-dot" /> THÀNH PHỐ MẪU{" "}
            <span className="caption-line" /> Đô thị mở rộng · Công trình
            placeholder
          </div>
          <div className="compass" aria-label="Hướng Bắc">
            <span>B</span>
            <svg width="36" height="36" viewBox="0 0 36 36">
              <path d="M18 4 26 29 18 24 10 29Z" fill="#38594e" />
              <path d="M18 4v20l-8 5Z" fill="#9aae9d" />
            </svg>
          </div>
          <div className="bottom-area">
            <div className="tool-panel">
              <div className="tool-title">GÓC NHÌN</div>
              <div className="tool-buttons">
                <button
                  aria-pressed={state?.grid ?? false}
                  onClick={grid}
                  disabled={!ready}
                  className={state?.grid ? "chosen" : ""}
                >
                  <Icon name="grid" />
                  <span>Lưới ô</span>
                </button>
                <button
                  onClick={() => engine.current?.resetCamera()}
                  disabled={!ready}
                >
                  <Icon name="camera" />
                  <span>Đặt lại góc nhìn</span>
                </button>
                <button
                  disabled={!ready}
                  onClick={() => engine.current?.focusBoulevard()}
                >
                  <Icon name="city" />
                  <span>Đại lộ</span>
                </button>
                <button
                  onClick={() => setSettings(!settings)}
                  aria-expanded={settings}
                >
                  <Icon name="settings" />
                  <span>Chất lượng</span>
                </button>
              </div>
            </div>
            <div className="controls-hint">
              <span>
                <b>Trái</b> Xoay / Chọn ô
              </span>
              <span>
                <b>Phải</b> Di chuyển
              </span>
              <span>
                <b>Cuộn</b> Thu phóng
              </span>
            </div>
          </div>
          <aside className="services-card" aria-label="Dịch vụ thành phố">
            <div className="card-kicker">
              <Icon name="city" size={16} /> DỊCH VỤ THÀNH PHỐ{" "}
              <span>06 ĐIỂM</span>
            </div>
            <h2>Một thành phố đủ đầy.</h2>
            <p>Chọn một địa điểm để đến gần hơn.</p>
            <div className="service-list">
              {(
                Object.entries(SERVICES) as [
                  ServiceKind,
                  (typeof SERVICES)[ServiceKind],
                ][]
              ).map(([kind, def]) => (
                <button
                  key={kind}
                  disabled={!ready}
                  onClick={() => engine.current?.focusService(kind)}
                  data-testid={`service-${kind}`}
                >
                  <span
                    className="service-symbol"
                    style={{ background: def.color }}
                  >
                    {def.symbol}
                  </span>
                  <span>{def.shortName}</span>
                  <Icon name="arrow" size={12} />
                </button>
              ))}
            </div>
            <div className="services-note">
              <span className="live-dot" /> Mô hình mẫu · Chưa mô phỏng dịch vụ
            </div>
          </aside>
          {selected && (
            <aside className="selection-card" data-testid="selection">
              <button
                className="dismiss"
                aria-label="Đóng thông tin ô"
                onClick={() => engine.current?.clearSelection()}
              >
                <Icon name="close" size={15} />
              </button>
              <div className="eyebrow">THÔNG TIN Ô</div>
              <h2>{selected.label}</h2>
              <p>
                Tọa độ {selected.x}, {selected.z} · {selected.zone}
              </p>
              <small>{selected.district} · Chế độ khám phá</small>
            </aside>
          )}
          {settings && (
            <aside className="settings-card">
              <div className="panel-heading">
                <h2>Tùy chọn đồ họa</h2>
                <button
                  aria-label="Đóng tùy chọn"
                  onClick={() => setSettings(false)}
                >
                  <Icon name="close" size={17} />
                </button>
              </div>
              <p>Chọn chất lượng phù hợp với thiết bị.</p>
              <div className="quality-options">
                {(["low", "medium", "high"] as const).map((q, i) => (
                  <button
                    key={q}
                    aria-pressed={state?.quality === q}
                    className={state?.quality === q ? "chosen" : ""}
                    onClick={() => quality(q)}
                  >
                    {["Thấp", "Vừa", "Cao"][i]}
                  </button>
                ))}
              </div>
              <small>
                Giới hạn pixel ratio và bóng đổ. Mức Vừa là mặc định cho đồ họa
                tích hợp.
              </small>
              <hr />
              <button
                className="reset-link"
                onClick={() => setResetConfirm(true)}
                disabled={!ready}
              >
                <Icon name="reset" size={16} /> Đặt lại thành phố
              </button>
            </aside>
          )}
          {error && (
            <div className="error-message" role="alert">
              {error}
              <button
                aria-label="Đóng thông báo lỗi"
                onClick={() => setError("")}
              >
                ×
              </button>
            </div>
          )}
          {notice && (
            <div className="toast" role="status">
              ✓ {notice}
            </div>
          )}
        </section>
        <footer className="statusbar">
          <span>
            <i className={ready ? "status-dot" : "status-dot waiting"} />
            {ready ? "Không gian đã sẵn sàng" : "Đang chuẩn bị không gian"}
          </span>
          <span
            className="render-stats"
            data-testid="render-stats"
            data-camera={stats.camera}
            data-chunks={stats.chunks}
            data-center={stats.chunkCenter}
            data-revision={stats.revision}
          >
            <b>{stats.fps}</b> FPS <span>·</span> {stats.calls} draw calls{" "}
            <span>·</span> {stats.triangles.toLocaleString()} tris
          </span>
          <span>
            <span data-testid="world-stats">
              {stats.chunks} chunks · {stats.buildings} công trình
            </span>
          </span>
        </footer>
      </main>
      {resetConfirm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">Bắt đầu lại?</h2>
            <p>
              Bản lưu trên thiết bị này sẽ được thay bằng thành phố mẫu. Thao
              tác này không thể hoàn tác.
            </p>
            <div>
              <button autoFocus onClick={() => setResetConfirm(false)}>
                Giữ thành phố
              </button>
              <button className="save-button" disabled={busy} onClick={reset}>
                Đặt lại dữ liệu
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
