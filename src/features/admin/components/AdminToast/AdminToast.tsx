"use client";

import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";
import { Toaster } from "sonner";

export function AdminToaster() {
  return (
    <Toaster
      position="top-right"
      duration={4_000}
      gap={10}
      offset={20}
      mobileOffset={12}
      visibleToasts={4}
      closeButton
      icons={{
        success: <CircleCheck className="h-[18px] w-[18px] text-[#2f8d88]" />,
        error: <CircleAlert className="h-[18px] w-[18px] text-[#d94a34]" />,
        warning: <TriangleAlert className="h-[18px] w-[18px] text-[#f07a58]" />,
        info: <Info className="h-[18px] w-[18px] text-[#123e66]" />,
        loading: <LoaderCircle className="h-[18px] w-[18px] animate-spin text-[#2f8d88]" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-xl !border-[#dfe5e8] !bg-[#fffdf9]/95 !text-[#123e66] !shadow-[0_14px_38px_rgba(18,62,102,0.16)] !backdrop-blur-xl",
          title: "!text-sm !font-extrabold !tracking-[-0.01em]",
          description: "!text-xs !leading-5 !text-[#647078]",
          success: "!border-l-4 !border-l-[#2f8d88]",
          error: "!border-l-4 !border-l-[#d94a34]",
          warning: "!border-l-4 !border-l-[#f07a58]",
          info: "!border-l-4 !border-l-[#123e66]",
          loading: "!border-l-4 !border-l-[#2f8d88]",
          actionButton: "!rounded-lg !bg-[#123e66] !font-bold !text-white",
          cancelButton: "!rounded-lg !bg-[#f4ebdd] !font-bold !text-[#123e66]",
          closeButton:
            "!border-[#dfe5e8] !bg-white !text-[#647078] hover:!border-[#2f8d88] hover:!text-[#2f8d88]",
        },
      }}
    />
  );
}
