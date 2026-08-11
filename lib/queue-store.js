import { checkLocalCallAvailability, createBooking as createLocalBooking, getBooking as getLocalBooking, listBookings as listLocalBookings, updateBooking as updateLocalBooking } from "./queue-db";
import { checkNotionCallAvailability, createNotionBooking, getNotionBooking, listNotionBookings, markNotionNotificationSent, updateNotionBooking } from "./notion-queue";

const useNotion = process.env.QUEUE_BACKEND === "notion";

export const checkCallAvailability = (input) => useNotion ? checkNotionCallAvailability(input) : Promise.resolve(checkLocalCallAvailability(input));
export const createBooking = (input) => useNotion ? createNotionBooking(input) : Promise.resolve(createLocalBooking(input));
export const getBooking = (code) => useNotion ? getNotionBooking(code) : Promise.resolve(getLocalBooking(code));
export const listBookings = (status) => useNotion ? listNotionBookings(status) : Promise.resolve(listLocalBookings(status));
export const markBookingNotificationSent = (booking) => useNotion ? markNotionNotificationSent(booking?.id) : Promise.resolve({ ...booking, notificationSent: true });
export const updateBooking = (code, input) => useNotion ? updateNotionBooking(code, input) : Promise.resolve(updateLocalBooking(code, input));
