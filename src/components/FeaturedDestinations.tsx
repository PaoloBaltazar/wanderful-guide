const destinations = [
  {
    id: 1,
    title: "Swiss Alps",
    location: "Switzerland",
    bestTime: "Dec - Mar",
    image: "https://images.unsplash.com/photo-1501854140801-50d01698950b",
  },
  {
    id: 2,
    title: "Kyoto Gardens",
    location: "Japan",
    bestTime: "Mar - May",
    image: "https://images.unsplash.com/photo-1500673922987-e212871fec22",
  },
  {
    id: 3,
    title: "Amalfi Coast",
    location: "Italy",
    bestTime: "Jun - Sep",
    image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb",
  },
];

import DestinationCard from "./DestinationCard";

const FeaturedDestinations = () => {
  return (
    <section className="py-16">
      <div className="container">
        <h2 className="mb-8 text-center text-3xl font-bold text-gray-900 md:text-4xl">
          Featured Destinations
        </h2>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <DestinationCard key={destination.id} {...destination} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedDestinations;