import { DateArg, format } from "date-fns";

function dt(date?: DateArg<Date>): string {
  return format(date ?? new Date(), "yyyy-MM-dd HH:mm:ss.SSS");
}

export default dt;
