function LoadingScreen() {
  return (
    <div className="flex h-[80vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-lg font-semibold animate-pulse">Loading...</p>
      </div>
    </div>
  );
}

export default LoadingScreen;
