import { Badge } from "./ui/badge";
import {
  IconCircleCheckFilled,
  IconMapPin,
  IconPencil,
  IconX,
} from "@tabler/icons-react";

export enum EventStatus {
  Completed = "completed",
  Live = "live",
  Active = "active",
  Draft = "draft",
  Canceled = "canceled",
}

interface EventStatusChipProps {
  status: EventStatus;
}

const statusIconMap: Record<EventStatus, React.ReactNode> = {
  [EventStatus.Completed]: (
    <IconCircleCheckFilled className="size-3.5 fill-green-500 dark:fill-green-400" />
  ),
  [EventStatus.Live]: (
    <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-500" />
  ),
  [EventStatus.Active]: <IconMapPin className="size-3.5 text-blue-500" />,
  [EventStatus.Draft]: <IconPencil className="size-3.5 text-gray-500" />,
  [EventStatus.Canceled]: <IconX className="size-3.5 text-red-500" />,
};

const EventStatusChip = ({ status }: EventStatusChipProps) => {
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground inline-flex items-center gap-1.5 px-1.5 bg-background"
    >
      {statusIconMap[status]}
      {status}
    </Badge>
  );
};

export default EventStatusChip;
