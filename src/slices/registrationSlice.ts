import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import axios from "axios";
import { createAppAsyncThunk } from "../createAsyncThunkWithTypes";

export type Registration = {
  agreedToPolicy: boolean,
  registered: boolean,
  termsVersionAgreed: string,
}

export type RegistrationState = {
  registration: boolean | null,
  error: boolean
};

// Initial state of health status in redux store
const initialState: RegistrationState = {
  registration: null,
  error: false,
};

// This is the registration itself
export const fetchRegistration = createAppAsyncThunk("registration/fetchRegistration", async () => {
  const res = await axios.get<Registration>("/admin-ng/adopter/registration");
  return res.data;
});

const registrationSlice = createSlice({
	name: "registration",
	initialState,
	reducers: {
		setError(state, action: PayloadAction<{
			error: RegistrationState["error"],
		}>) {
			state.error = action.payload.error;
		},
	},
	// These are used for thunks
	extraReducers: builder => {
		builder
			/* .addCase(fetchRegistration.pending, state => {
				state.statusHealth = "loading";
			}) */
			.addCase(fetchRegistration.fulfilled, (state, _action: PayloadAction<
				Registration
			>) => {
        state.registration = true;
			})
			/* .addCase(fetchHealthStatus.rejected, (state, action) => {
        state.error = true;
			}) */;
	},
});

export const { setError } = registrationSlice.actions;

// Export the slice reducer as the default export
export default registrationSlice.reducer;
