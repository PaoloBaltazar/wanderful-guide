import { MapPin } from "lucide-react";

const Hero = () => {
  return (
    <div className="relative h-[80vh] w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            'url("https://images.unsplash.com/photo-1469474968028-56623f02e42e")',
        }}
      />
      <div className="absolute inset-0 bg-black/40" />
      <div className="relative flex h-full items-center justify-center">
        <div className="text-center text-white">
          <h1 className="mb-6 text-5xl font-bold md:text-7xl">
            Discover the World
          </h1>
          <p className="mb-8 text-xl md:text-2xl">
            Your journey begins with a single destination
          </p>
          <button className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-lg font-semibold text-white transition-all hover:bg-primary/90">
            <MapPin className="h-5 w-5" />
            Explore Destinations
          </button>
        </div>
      </div>
    </div>
  );
};

export default Hero;