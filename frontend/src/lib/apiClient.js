import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

/** Resolve a possibly-relative API image URL to an absolute URL. */
export function resolveImage(url) {
  if (!url) return url;
  if (url.startsWith("/api/")) return BACKEND_URL + url;
  return url;
}

export const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("lms_token");
  if (token) {
    config.headers = config.headers || {};
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

export function setToken(token) {
  if (token) localStorage.setItem("lms_token", token);
  else localStorage.removeItem("lms_token");
}

export function getToken() {
  return localStorage.getItem("lms_token");
}

export function formatApiError(err) {
  const detail = err?.response?.data?.detail;
  if (detail == null) return err?.message || "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail.map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e))).join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

// YouTube URL → privacy-enhanced embed URL (no related videos, no branding, no clicks-out)
export function toYouTubeEmbed(url) {
  if (!url) return "";
  try {
    const u = new URL(url);
    let id = "";
    if (u.hostname.includes("youtu.be")) id = u.pathname.slice(1);
    else if (u.searchParams.get("v")) id = u.searchParams.get("v");
    else if (u.pathname.includes("/live/")) id = u.pathname.split("/live/")[1];
    else if (u.pathname.includes("/embed/")) id = u.pathname.split("/embed/")[1];
    if (!id) return url;
    const params = new URLSearchParams({
      rel: "0",              // no related videos at end
      modestbranding: "1",   // hide YT logo as much as allowed
      iv_load_policy: "3",   // no video annotations
      playsinline: "1",      // inline on iOS
      disablekb: "1",        // disable keyboard shortcuts (incl. share)
      fs: "1",               // allow fullscreen inside our player
      controls: "1",
    });
    // youtube-nocookie domain disables tracking + reduces external suggestion overlays
    return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
  } catch {
    return url;
  }
}

export function formatDuration(seconds) {
  if (!seconds) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
