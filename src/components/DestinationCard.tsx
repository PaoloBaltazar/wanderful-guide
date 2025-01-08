import { Calendar, MapPin } from "lucide-react";

interface DestinationCardProps {
  image: string;
  title: string;
  location: string;
  bestTime: string;
}

const DestinationCard = ({
  image,
  title,
  location,
  bestTime,
}: DestinationCardProps) => {
  return (
    <div className="group relative overflow-hidden rounded-lg bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
        />
      </div>
      <div className="p-4">
        <h3 className="mb-2 text-xl font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            <span>{bestTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DestinationCard;