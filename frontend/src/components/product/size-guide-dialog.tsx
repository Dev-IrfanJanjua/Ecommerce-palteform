"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SIZE_CHART, SIZE_GUIDE_TIP } from "@/data/size-chart";

/**
 * Size guide.
 *
 * Stock is EU-only; UK, US and centimetres are shown to help a shopper choose,
 * never as separate inventory. The table scrolls inside its own container so a
 * narrow phone never forces the whole page sideways.
 */
export function SizeGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="link" size="sm" className="text-body-sm h-auto p-0">
          Size guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Size guide</DialogTitle>
          <DialogDescription>{SIZE_GUIDE_TIP}</DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="text-body-sm w-full">
            <thead>
              <tr className="border-border border-b text-left">
                <th scope="col" className="py-2 pr-4 font-medium">
                  EU
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  UK
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  US (M)
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  US (W)
                </th>
                <th scope="col" className="py-2 font-medium">
                  Foot (cm)
                </th>
              </tr>
            </thead>
            <tbody>
              {SIZE_CHART.map((row) => (
                <tr key={row.eu} className="border-border/60 border-b last:border-0">
                  <th scope="row" className="py-2 pr-4 text-left font-medium">
                    {row.eu}
                  </th>
                  <td className="text-muted-foreground py-2 pr-4">{row.uk}</td>
                  <td className="text-muted-foreground py-2 pr-4">{row.usMen}</td>
                  <td className="text-muted-foreground py-2 pr-4">{row.usWomen}</td>
                  <td className="text-muted-foreground py-2">{row.cm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
