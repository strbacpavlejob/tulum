function AiAssistent() {
  return (
    <div className="absolute inset-0 flex items-center justify-center [mask-image:linear-gradient(to_top,transparent_40%,#000_100%)]">
      <div className="relative h-32 w-32">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-20 blur-xl animate-pulse"></div>
        <div className="absolute inset-4 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 opacity-30 blur-lg animate-pulse delay-75"></div>
        <div className="absolute inset-8 rounded-full bg-gradient-to-r from-violet-500 to-purple-500 opacity-40 blur-md animate-pulse delay-150"></div>
      </div>
    </div>
  );
}

export default AiAssistent;
