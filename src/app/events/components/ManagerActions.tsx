"use client";

import { Button } from "@/components/ui/button";
import { Eye, Edit, Trash2, Share2, Copy } from "lucide-react";
import { useRouter } from "next/navigation";
import { EventData } from "@/services/eventService";
import { shareEventLink } from "@/lib/utils/share";
import { toast } from "sonner";

interface ManagerActionsProps {
  event: EventData;
  onEdit: (event: EventData) => void;
  onDelete: (event: EventData) => void;
  compact?: boolean;
  onCopy?: (event: EventData) => void;
}

export function ManagerActions({
  event,
  onEdit,
  onDelete,
  compact,
  onCopy,
}: ManagerActionsProps) {
  const router = useRouter();
  const isCompact = !!compact;
  const containerSpacing = isCompact ? "space-x-1" : "space-x-2";
  const outlineClass = "hover:!bg-[#E91E63] hover:!text-white";
  const outlineStyle = {
    borderColor: "#E91E63",
    color: "#E91E63",
    backgroundColor: "transparent",
  } as const;

  return (
    <div
      className={`flex ${containerSpacing}`}
      onClick={(e) => e.stopPropagation()}
    >
      <Button
        variant="outline"
        size={isCompact ? "icon" : "sm"}
        onClick={() => onCopy?.(event)}
        style={outlineStyle}
        className={outlineClass}
        title="Copy"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#E91E63";
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#E91E63";
        }}
      >
        <Copy className={isCompact ? "h-4 w-4" : "h-4 w-4 mr-1"} />
        {!isCompact && <span>Copy</span>}
      </Button>
      <Button
        variant="outline"
        size={isCompact ? "icon" : "sm"}
        onClick={async () => {
          const { result } = await shareEventLink(event.id, event.label);
          toast.success(
            result === "shared" ? "Share dialog opened" : "Link copied"
          );
        }}
        style={outlineStyle}
        className={outlineClass}
        title="Share"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#E91E63";
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#E91E63";
        }}
      >
        <Share2 className={isCompact ? "h-4 w-4" : "h-4 w-4 mr-1"} />
        {!isCompact && <span>Share</span>}
      </Button>
      <Button
        variant="outline"
        size={isCompact ? "icon" : "sm"}
        onClick={() => router.push(`/events/${event.id}`)}
        style={outlineStyle}
        className={outlineClass}
        title="View"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#E91E63";
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#E91E63";
        }}
      >
        <Eye className={isCompact ? "h-4 w-4" : "h-4 w-4 mr-1"} />
        {!isCompact && <span>View</span>}
      </Button>
      <Button
        variant="outline"
        size={isCompact ? "icon" : "sm"}
        onClick={() => onEdit(event)}
        style={outlineStyle}
        className={outlineClass}
        title="Edit"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#E91E63";
          e.currentTarget.style.color = "white";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "#E91E63";
        }}
      >
        <Edit className={isCompact ? "h-4 w-4" : "h-4 w-4 mr-1"} />
        {!isCompact && <span>Edit</span>}
      </Button>
      <Button
        size={isCompact ? "icon" : "sm"}
        onClick={() => onDelete(event)}
        className="bg-[#E91E63] hover:bg-[#C2185B] text-white"
        title="Delete"
      >
        <Trash2 className={isCompact ? "h-4 w-4" : "h-4 w-4 mr-1"} />
        {!isCompact && <span>Delete</span>}
      </Button>
    </div>
  );
}
