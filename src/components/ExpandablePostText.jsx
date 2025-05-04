import React from "react";
import dashboardStyles from "../styles/DashboardPage.module.css";

// Utility to check if text is long (same as DashboardPage)
function isTextLong(text) {
  if (!text) return false;
  return (
    text.length > 400 ||
    (text.match(/<br\s*\/?>(?![^<]*<br)/gi) || []).length > 4
  );
}

export default function ExpandablePostText({ html, expanded, onToggle }) {
  // Helper to render faded text with Read More inline
  if (!expanded && isTextLong(html)) {
    // Only fade the end of the last visible line, not all lines
    return (
      <div style={{ position: "relative", display: "block", minHeight: 0 }}>
        <span
          className={dashboardStyles.articleText}
          style={{
            display: "-webkit-box",
            WebkitLineClamp: 4,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            position: "relative",
            whiteSpace: "pre-line",
            lineHeight: 1.7,
            maxHeight: "6.8em",
            minHeight: 0,
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {/* Fade only the end of the last line, not the whole text */}
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            height: "1.7em",
            width: 110,
            pointerEvents: "none",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, #fff 60%, #fff 100%)",
            zIndex: 1,
            display: "block",
          }}
        />
        <span
          style={{
            position: "absolute",
            right: 0,
            bottom: 0,
            background: "#fff",
            fontSize: "0.95em",
            color: "#555",
            padding: "0 8px 2px 8px",
            borderRadius: 6,
            cursor: "pointer",
            zIndex: 2,
            opacity: 0.85,
            display: "inline-flex",
            alignItems: "center",
            boxShadow: "0 0 0 2px #fff, 0 0 8px 4px #fff",
            marginLeft: 4,
            lineHeight: 1.7,
            pointerEvents: "auto",
          }}
          onClick={onToggle}
        >
          <span style={{ fontWeight: "bold", fontSize: "1.2em", marginRight: 2 }}>...</span>
          <span style={{ fontSize: "0.92em", opacity: 0.7 }}>Read More</span>
        </span>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div
        className={expanded ? undefined : dashboardStyles.articleText}
        style={
          expanded
            ? {
                display: "block",
                whiteSpace: "pre-line",
                overflow: "visible",
                WebkitLineClamp: "unset",
                maxHeight: "none",
              }
            : undefined
        }
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {expanded && isTextLong(html) && (
        <div
          style={{
            marginTop: 8,
            textAlign: "right",
            opacity: 0.7,
            fontSize: "0.95em",
            color: "#555",
            cursor: "pointer",
            display: "inline-block",
          }}
          onClick={onToggle}
        >
          <span style={{ fontSize: "0.92em", opacity: 0.7 }}>Show Less</span>
        </div>
      )}
    </div>
  );
}
