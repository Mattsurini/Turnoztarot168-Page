import { checkLocalCallAvailability, createBooking as createLocalBooking, getBooking as getLocalBooking, listBookings as listLocalBookings, updateBooking as updateLocalBooking } from "./queue-db";
import { checkNotionCallAvailability, createNotionBooking, getNotionBooking, listNotionBookings, markNotionNotificationSent, updateNotionNotification, updateNotionBooking } from "./notion-queue";
import { createD1Booking, listD1Bookings, updateD1Booking } from "./d1-client";

const backend = process.env.QUEUE_BACKEND || "notion";
const useD1 = backend === "d1";
const useNotion = backend === "notion";

export const checkCallAvailability = (input) => useNotion ? checkNotionCallAvailability(input) : Promise.resolve(checkLocalCallAvailability(input));
export const createBooking = (input) => useD1 ? createD1Booking(input) : useNotion ? createNotionBooking(input) : Promise.resolve(createLocalBooking(input));
export const getBooking = (code) => useD1 ? Promise.resolve(null) : useNotion ? getNotionBooking(code) : Promise.resolve(getLocalBooking(code));
export const listBookings = (status) => useD1 ? listD1Bookings(status) : useNotion ? listNotionBookings(status) : Promise.resolve(listLocalBookings(status));
export const markBookingNotificationSent = (booking) => useNotion ? markNotionNotificationSent(booking?.id) : Promise.resolve({ ...booking, notificationSent: true });
export const updateBookingNotification = (booking, state) => useNotion ? updateNotionNotification(booking?.id, state) : Promise.resolve({ ...booking, notificationStatus: state, notificationSent: state === "sent" });
export const updateBooking = (code, input) => useD1 ? updateD1Booking(code, input) : useNotion ? updateNotionBooking(code, input) : Promise.resolve(updateLocalBooking(code, input));
