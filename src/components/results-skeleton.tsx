import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Reserves the shape of the results card so nothing jumps when they land. */
export function ResultsSkeleton() {
  return (
    <Card aria-hidden>
      <CardHeader className="gap-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-8 w-full" />
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[92%]" />
          <Skeleton className="h-4 w-[96%]" />
          <Skeleton className="h-4 w-[64%]" />
        </div>
      </CardContent>
      <CardFooter className="gap-2 border-t pt-4">
        <Skeleton className="h-11 w-40" />
        <Skeleton className="h-11 w-28" />
      </CardFooter>
    </Card>
  );
}
