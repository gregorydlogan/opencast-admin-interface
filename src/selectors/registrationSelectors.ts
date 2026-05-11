import { RootState } from "../store";

/**
 * This file contains selectors regarding information about the registration status
 */
// Are we registered at all
export const getRegistration = (state: RootState) => state.registration.registration;
