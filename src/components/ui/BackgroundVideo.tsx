export function BackgroundVideo() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="w-full h-full object-cover opacity-30"
      >
        <source
          src="https://bloujipdkyjsgzwxnoej.supabase.co/storage/v1/object/public/storage/homelivebg.mp4"
          type="video/mp4"
        />
      </video>
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
