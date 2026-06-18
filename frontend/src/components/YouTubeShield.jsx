import React from "react";

/**
 * Click-trap shield to discourage YouTube external navigation WITHOUT
 * touching the iframe itself (no sandbox, no embed-param changes).
 *
 * Approach:
 *  - Render the iframe as a child via render prop.
 *  - Place a thin transparent overlay (~44px) over the TOP of the player
 *    where YouTube's "Watch on YouTube" / channel title link appears when
 *    the video is paused. Clicking the title bar now does nothing instead
 *    of opening youtube.com.
 *  - Pause/play, scrub, fullscreen, volume and live indicator all sit
 *    BELOW the 44px band so they remain fully interactive.
 *  - Bottom-right YouTube logo (small grey "▶ YouTube" badge near the
 *    controls) is intentionally NOT covered — covering it would also
 *    block the fullscreen / settings buttons. This keeps playback intact
 *    while removing the most prominent external-navigation path.
 */
export default function YouTubeShield({ children, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {/* Top title-bar click-trap. Pointer-events on, but visually invisible. */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-0 right-0 h-11 z-10"
        style={{ background: "transparent" }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        data-testid="yt-title-shield"
      />
    </div>
  );
}
