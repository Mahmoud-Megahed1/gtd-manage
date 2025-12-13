import { DayPicker } from "react-day-picker";
import { ar } from "date-fns/locale";
import "react-day-picker/dist/style.css";

export default function TeamCalendar({ leaves }: { leaves: any[] }) {
  const days = leaves
    .filter(l => l.status === "approved")
    .flatMap(l => {
      const s = new Date(l.startDate);
      const e = new Date(l.endDate);
      const dates: Date[] = [];
      for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
      return dates;
    });
  const modifiers = { leave: days };
  const modifiersStyles = {
    leave: { backgroundColor: "#fde68a", color: "#1f2937" },
  } as any;
  return (
    <DayPicker
      locale={ar as any}
      mode="single"
      modifiers={modifiers}
      modifiersStyles={modifiersStyles}
      showOutsideDays
    />
  );
}
