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
      {!expanded && isTextLong(html) && (
        <>
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              height: "1.8em",
              width: "8.5em",
              pointerEvents: "none",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, #fff 60%, #fff 100%)",
              zIndex: 1,
              display: "inline-block",
              textAlign: "right",
            }}
          />
          <div
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
              pointerEvents: "auto",
              display: "inline-block",
              boxShadow: "0 0 0 2px #fff, 0 0 8px 4px #fff",
              textAlign: "right",
              right: 0,
              left: "auto",
              marginLeft: "auto",
              marginRight: 0,
              ...(window.innerWidth >= 769
                ? { transform: "translateY(0%)" }
                : {}),
            }}
            onClick={onToggle}
          >
            <span
              style={{ fontWeight: "bold", fontSize: "1.2em", marginRight: 2 }}
            >
              ...
            </span>
            <span style={{ fontSize: "0.92em", opacity: 0.7 }}>Read More</span>
          </div>
        </>
      )}
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
