import type { ComponentProps } from "react";
import { cn } from "@/components/lib/utils.js";

export const productBrandLogoUrl = new URL(
  "../../../../../public/logo/icons/512x512.png",
  import.meta.url,
).href;

type ZCodeBrandLogoProps = Omit<ComponentProps<"img">, "src">;

export function ZCodeAboutLogo({
  alt = "",
  className,
  draggable = false,
  ...props
}: ZCodeBrandLogoProps) {
  return (
    <img
      {...props}
      src={productBrandLogoUrl}
      alt={alt}
      width={512}
      height={512}
      draggable={draggable}
      className={cn("shrink-0 object-contain", className)}
      aria-hidden={alt ? undefined : true}
    />
  );
}

export function ZCodeWordmarkLogo(props: ZCodeBrandLogoProps) {
  return <ZCodeAboutLogo {...props} />;
}
