import React, { useRef, useEffect } from "react";

function NotificationPanel({ notifications, show, toggle }) {
  const panelRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      // If clicked outside the panel and the bell button, close panel
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target)
      ) {
        if (show) toggle();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [show, toggle]);

  return (
    <div className="relative z-50">
      <div className="flex justify-end items-center pr-6 pt-2">
        <button
          ref={buttonRef}
          onClick={toggle}
          className="relative"
          title="View Notifications"
        >
          <span className="text-2xl">🔔</span>
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 text-xs text-white bg-red-600 rounded-full px-1">
              {notifications.length}
            </span>
          )}
        </button>
      </div>
      {show && (
        <div
          ref={panelRef}
          className="absolute top-12 right-4 w-80 max-h-96 bg-white shadow-lg rounded-lg overflow-auto border border-amber-50 p-4"
        >
          <h2 className="text-lg font-semibold mb-2">Notifications</h2>
          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">No alerts yet.</p>
          ) : (
            notifications.map((note, index) => (
              <div key={index} className="py-2">
                <p
                  className={`font-medium ${
                    note.type === "low" ? "text-blue-600" : "text-black"
                  }`}
                >
                  {note.message}
                </p>
                <p className="text-sm text-gray-500">
                  Value: {note.value}, Threshold: {note.limit} <br />
                  <span>{note.timestamp}</span>
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationPanel;
