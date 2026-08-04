import type { ComponentProps, ReactNode } from "react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CrewLogo } from "@/components/ui/CrewLogo";
import { cn } from "@/lib/utils";

export type PassportProps = Omit<
  ComponentProps<typeof Card>,
  "children" | "title"
> & {
  children?: ReactNode;
  subtitle?: ReactNode;
  title?: ReactNode;
  titleId?: string;
};

export const passportHeadingClassName =
  "text-2xl leading-tight font-medium tracking-tight";

export function Passport({
  children,
  className,
  subtitle,
  title,
  titleId,
  ...props
}: PassportProps) {
  const hasContent = children !== null && children !== undefined;
  const hasSubtitle = subtitle !== null && subtitle !== undefined;
  const hasTitle = title !== null && title !== undefined;

  return (
    <Card
      className={cn(
        "relative z-10 max-h-[calc(100dvh-1rem)] w-full max-w-sm gap-0 overflow-y-auto border-0 bg-card/70 py-0 shadow-none sm:max-h-[calc(100dvh-4rem)]",
        className,
        "backdrop-blur-lg",
      )}
      data-passport=""
      {...props}
    >
      <CardHeader
        className={cn(
          "gap-0 px-6 pt-6 sm:px-8 sm:pt-8",
          !hasContent && "pb-6 sm:pb-8",
        )}
      >
        <CardTitle className="w-fit">
          <CrewLogo />
        </CardTitle>
        {hasTitle ? (
          <h1
            className={cn("mt-6", passportHeadingClassName)}
            data-slot="passport-title"
            id={titleId}
          >
            {title}
          </h1>
        ) : null}
        {hasSubtitle ? (
          <CardDescription
            className={cn(
              "text-base text-foreground/75",
              hasTitle ? "mt-2" : "mt-6",
            )}
          >
            {subtitle}
          </CardDescription>
        ) : null}
      </CardHeader>
      {hasContent ? (
        <CardContent className="px-6 pt-6 pb-6 sm:px-8 sm:pb-8">
          {children}
        </CardContent>
      ) : null}
    </Card>
  );
}
