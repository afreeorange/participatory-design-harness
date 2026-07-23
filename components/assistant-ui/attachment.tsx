"use client";

import { type PropsWithChildren, useEffect, useState, type FC, isValidElement } from "react";
import { XIcon, PlusIcon, FileText, Loader2Icon, AlertCircleIcon } from "lucide-react";
import {
  AttachmentPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  useAuiState,
  useAui,
} from "@assistant-ui/react";
import { useShallow } from "zustand/shallow";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogTitle, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";

const useFileSrc = (file: File | undefined) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!file) {
      setSrc(undefined);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return src;
};

const useAttachmentSrc = () => {
  const { file, src } = useAuiState(
    useShallow((s): { file?: File; src?: string } => {
      if (s.attachment.type !== "image") return {};
      if (s.attachment.file) return { file: s.attachment.file };
      const src = s.attachment.content?.filter((c) => c.type === "image")[0]?.image;
      if (!src) return {};
      return { src };
    }),
  );

  return useFileSrc(file) ?? src;
};

type AttachmentPreviewProps = {
  src: string;
};

const AttachmentPreview: FC<AttachmentPreviewProps> = ({ src }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  return (
    <img
      src={src}
      alt="Attachment preview"
      className={cn(
        "block w-auto max-w-full h-auto max-h-[80vh] object-contain",
        isLoaded
          ? "aui-attachment-preview-image-loaded"
          : "aui-attachment-preview-image-loading invisible",
      )}
      onLoad={() => setIsLoaded(true)}
    />
  );
};

const AttachmentPreviewDialog: FC<PropsWithChildren> = ({ children }) => {
  const src = useAttachmentSrc();

  if (!src) return children;

  return (
    <Dialog>
      <DialogTrigger
        nativeButton={false}
        className="hover:bg-accent/50 transition-colors cursor-pointer aui-attachment-preview-trigger"
        render={isValidElement(children) ? children : <button type="button" />}
      />
      <DialogContent className="[&>button]:bg-foreground/60 [&>button]:opacity-100 p-2 [&>button]:p-1 [&>button]:rounded-full [&>button]:ring-0! sm:max-w-3xl [&_svg]:text-background [&>button]:hover:[&_svg]:text-destructive aui-attachment-preview-dialog-content">
        <DialogTitle className="aui-sr-only sr-only">Image Attachment Preview</DialogTitle>
        <div className="relative flex justify-center items-center bg-background mx-auto w-full max-h-[80dvh] overflow-hidden aui-attachment-preview">
          <AttachmentPreview src={src} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const AttachmentThumb: FC = () => {
  const src = useAttachmentSrc();

  return (
    <Avatar className="rounded-none w-full h-full aui-attachment-tile-avatar">
      <AvatarImage
        src={src}
        alt="Attachment preview"
        className="object-cover aui-attachment-tile-image"
      />
      <AvatarFallback>
        <FileText className="size-8 text-muted-foreground aui-attachment-tile-fallback-icon" />
      </AvatarFallback>
    </Avatar>
  );
};

const AttachmentUI: FC = () => {
  const aui = useAui();
  const isComposer = aui.attachment.source !== "message";

  const isImage = useAuiState((s) => s.attachment.type === "image");
  const typeLabel = useAuiState((s) => {
    const type = s.attachment.type;
    switch (type) {
      case "image":
        return "Image";
      case "document":
        return "Document";
      case "file":
        return "File";
      default:
        return type;
    }
  });

  const uploadState = useAuiState((s) =>
    s.attachment.status.type === "running"
      ? "uploading"
      : s.attachment.status.type === "incomplete" && s.attachment.status.reason === "error"
        ? "error"
        : undefined,
  );
  const isUploading = uploadState === "uploading";
  const isError = uploadState === "error";

  const errorMessage = useAuiState((s) =>
    s.attachment.status.type === "incomplete" && s.attachment.status.reason === "error"
      ? (s.attachment.status.message ?? "Upload failed")
      : undefined,
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <AttachmentPrimitive.Root
          className={cn(
            "relative aui-attachment-root",
            isImage && !isComposer && "aui-attachment-root-message only:*:first:size-24",
          )}
        >
          <AttachmentPreviewDialog>
            <TooltipTrigger
              render={
                <div
                  className={cn(
                    "relative bg-muted hover:opacity-75 border rounded-[calc(var(--composer-radius)-var(--composer-padding))] size-14 overflow-hidden transition-opacity cursor-pointer aui-attachment-tile",
                    isError && "border-destructive",
                  )}
                  role="button"
                  tabIndex={0}
                  aria-label={`${typeLabel} attachment${
                    isError ? ", upload failed" : isUploading ? ", uploading" : ""
                  }`}
                />
              }
            >
              <AttachmentThumb />
              {isUploading && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex justify-center items-center bg-background/60 backdrop-blur-[1px] aui-attachment-tile-uploading"
                >
                  <Loader2Icon className="size-6 text-muted-foreground animate-spin" />
                </div>
              )}
              {isError && (
                <div
                  aria-hidden="true"
                  className="absolute inset-0 flex justify-center items-center bg-destructive/10 aui-attachment-tile-error"
                >
                  <AlertCircleIcon className="size-6 text-destructive" />
                </div>
              )}
            </TooltipTrigger>
          </AttachmentPreviewDialog>
          {isComposer && <AttachmentRemove />}
        </AttachmentPrimitive.Root>
        <TooltipContent side="top">
          <AttachmentPrimitive.Name />
          {errorMessage && <p className="aui-attachment-error-message">{errorMessage}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

const AttachmentRemove: FC = () => {
  return (
    <AttachmentPrimitive.Remove
      render={
        <TooltipIconButton
          tooltip="Remove file"
          className="top-1.5 absolute bg-white hover:bg-white! opacity-100 shadow-sm rounded-full size-3.5 text-muted-foreground [&_svg]:text-black hover:[&_svg]:text-destructive aui-attachment-tile-remove end-1.5"
          side="top"
        />
      }
    >
      <XIcon className="dark:stroke-[2.5px] size-3 aui-attachment-remove-icon" />
    </AttachmentPrimitive.Remove>
  );
};

export const UserMessageAttachments: FC = () => {
  return (
    <div className="flex flex-row justify-end gap-2 col-span-full col-start-1 row-start-1 w-full aui-user-message-attachments-end">
      <MessagePrimitive.Attachments>{() => <AttachmentUI />}</MessagePrimitive.Attachments>
    </div>
  );
};

export const ComposerAttachments: FC = () => {
  return (
    <div className="empty:hidden flex flex-row items-center gap-2 w-full overflow-x-auto aui-composer-attachments">
      <ComposerPrimitive.Attachments>{() => <AttachmentUI />}</ComposerPrimitive.Attachments>
    </div>
  );
};

export const ComposerAddAttachment: FC = () => {
  return (
    <ComposerPrimitive.AddAttachment
      render={
        <TooltipIconButton
          tooltip="Add Attachment"
          side="bottom"
          variant="ghost"
          size="icon"
          className="hover:bg-muted-foreground/15 dark:hover:bg-muted-foreground/30 p-1 dark:border-muted-foreground/15 rounded-full size-7 font-semibold text-xs aui-composer-add-attachment"
          aria-label="Add Attachment"
        />
      }
    >
      <PlusIcon className="stroke-[1.5px] size-4.5 aui-attachment-add-icon" />
    </ComposerPrimitive.AddAttachment>
  );
};
