// components/VideoPlayer.jsx
import { useState } from "react";

export default function VideoPlayer() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="relative w-full h-100 md:h-130 overflow-hidden my-8">
      {!showVideo ? (
        <>
          <div
            onClick={() => setShowVideo(true)}
            className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer"
          >
            <div className="w-20 h-20 bg-green-600 bg-opacity-80 rounded-full flex items-center justify-center transform hover:scale-110 transition-transform">
              <i className="fas fa-play text-white text-3xl" />
            </div>
          </div>
          <img
            src="https://images.unsplash.com/photo-1524486361537-8ad15938e1a3?q=80&w=1469&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
            alt="Video thumbnail"
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
        </>
      ) : (
        <iframe
            className="absolute inset-0 w-full h-full"
            src="https://www.youtube.com/embed/hXC7vCcg2xo"
            title="YouTube video"
            frameBorder="0"
            allow="autoplay; encrypted-media"
            allowFullScreen
          ></iframe>

      )}
    </div>
  );
}
