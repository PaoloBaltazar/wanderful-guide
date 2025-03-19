
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, CaptionProps } from "react-day-picker";
import { format, getYear, getMonth, setYear, setMonth } from "date-fns";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Extended CalendarProps to include onSelect and onMonthChange
export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  onSelect?: (date: Date | undefined) => void;
  onMonthChange?: (date: Date) => void;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  month,
  ...props
}: CalendarProps) {
  // Create a ref to track the current month
  const [currentMonth, setCurrentMonth] = React.useState<Date>(month || new Date());
  
  // Update internal state when month prop changes
  React.useEffect(() => {
    if (month) {
      setCurrentMonth(month);
    }
  }, [month]);

  // Create a custom caption component with month and year dropdowns
  function CustomCaption(captionProps: CaptionProps) {
    const { displayMonth } = captionProps;
    
    const months = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    
    // Get the current year and create a range of years from 1900 to 2100
    const years = Array.from(
      { length: 201 },
      (_, i) => 1900 + i
    );
    
    const handleMonthChange = (value: string) => {
      const newMonthIndex = months.indexOf(value);
      if (newMonthIndex !== -1 && displayMonth) {
        const newDate = setMonth(displayMonth, newMonthIndex);
        
        // Update the internal current month
        setCurrentMonth(newDate);
        
        // Call the parent component's onMonthChange if provided
        if (props.onMonthChange) {
          props.onMonthChange(newDate);
        }
      }
    };
    
    const handleYearChange = (value: string) => {
      const year = parseInt(value, 10);
      if (!isNaN(year) && displayMonth) {
        const newDate = setYear(displayMonth, year);
        
        // Update the internal current month
        setCurrentMonth(newDate);
        
        // Call the parent component's onMonthChange if provided
        if (props.onMonthChange) {
          props.onMonthChange(newDate);
        }
      }
    };
    
    // Get current month and year from displayMonth
    const currentMonthName = displayMonth ? months[getMonth(displayMonth)] : months[0];
    const currentYear = displayMonth ? getYear(displayMonth).toString() : "2023";
    
    return (
      <div className="flex items-center justify-center gap-2">
        <Select 
          value={currentMonthName} 
          onValueChange={handleMonthChange}
        >
          <SelectTrigger className="h-8 w-[120px] text-sm font-medium border-none bg-transparent">
            <SelectValue placeholder="Month">{currentMonthName}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {months.map(month => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select 
          value={currentYear} 
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="h-8 w-[80px] text-sm font-medium border-none bg-transparent">
            <SelectValue placeholder="Year">{currentYear}</SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <DayPicker
      month={currentMonth}
      showOutsideDays={showOutsideDays}
      className={cn("p-3 rounded-lg shadow-md bg-white pointer-events-auto", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4",
        caption: "flex justify-center pt-1 relative items-center mb-3",
        caption_label: "text-sm font-medium hidden", // Hide default caption
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 text-muted-foreground hover:text-foreground border-none hover:bg-accent/30"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse space-y-1",
        head_row: "flex",
        head_cell:
          "text-muted-foreground rounded-md w-9 font-medium text-xs uppercase py-2",
        row: "flex w-full mt-2",
        cell: cn(
          "relative p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
          "[&:has([aria-selected].day-outside)]:bg-accent/40 [&:has([aria-selected].day-range-end)]:rounded-r-md"
        ),
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal aria-selected:opacity-100 rounded-md transition-all hover:bg-accent hover:text-accent-foreground"
        ),
        day_selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground shadow-sm",
        day_today: "bg-accent/70 text-accent-foreground font-medium",
        day_outside:
          "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/40 aria-selected:text-muted-foreground aria-selected:opacity-30",
        day_disabled: "text-muted-foreground opacity-50",
        day_range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        day_range_end: "day-range-end",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
        IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        Caption: (captionProps) => <CustomCaption {...captionProps} />
      }}
      onMonthChange={(month) => {
        setCurrentMonth(month);
        if (props.onMonthChange) {
          props.onMonthChange(month);
        }
      }}
      onDayClick={(day) => {
        if (props.onSelect) {
          props.onSelect(day);
        }
      }}
      footer={
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-border">
          <button 
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
            onClick={() => {
              // Clear date selection
              if (props.onSelect) {
                props.onSelect(undefined);
              }
            }}
          >
            Clear
          </button>
          <button 
            className="text-sm font-medium text-primary hover:underline transition-colors"
            onClick={() => {
              const today = new Date();
              // Update internal state
              setCurrentMonth(today);
              // Update parent components
              if (props.onSelect) {
                props.onSelect(today);
              }
              if (props.onMonthChange) {
                props.onMonthChange(today);
              }
            }}
          >
            Today
          </button>
        </div>
      }
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
