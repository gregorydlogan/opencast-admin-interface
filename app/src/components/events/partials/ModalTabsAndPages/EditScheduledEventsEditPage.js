import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import cn from "classnames";
import { connect } from "react-redux";
import { Field, FieldArray } from "formik";
import Notifications from "../../../shared/Notifications";
import RenderField from "../../../shared/wizard/RenderField";
import { getTimezoneOffset, hasAccess } from "../../../../utils/utils";
import { hours, minutes, weekdays } from "../../../../configs/modalConfig";
import {
	checkForSchedulingConflicts,
	fetchScheduling,
} from "../../../../thunks/eventThunks";
import { addNotification } from "../../../../thunks/notificationThunks";
import { removeNotificationWizardForm } from "../../../../actions/notificationActions";
import { getUserInformation } from "../../../../selectors/userInfoSelectors";
import {
	getSchedulingSeriesOptions,
	isLoadingScheduling,
} from "../../../../selectors/eventSelectors";
import { checkSchedulingConflicts } from "../../../../utils/bulkActionUtils";
import DropDown from "../../../shared/DropDown";

/**
 * This component renders the edit page for scheduled events of the corresponding bulk action
 */
const EditScheduledEventsEditPage = ({
	previousPage,
	nextPage,
	formik,
	inputDevices,
	conflictState: { conflicts, setConflicts },
	setPageCompleted,
	checkForSchedulingConflicts,
	addNotification,
	removeNotificationWizardForm,
	fetchSchedulingData,
	loading,
	seriesOptions,
	user,
}) => {
	const { t } = useTranslation();

	useEffect(() => {
		const fetchEventInfos =
			formik.values.editedEvents.length !== formik.values.events ||
			formik.values.events.some(
				(event) =>
					!formik.values.editedEvents.find((e) => e.eventId === event.id)
			);

		// Fetch data about series and schedule info of chosen events from backend
		fetchSchedulingData(
			formik.values.events,
			fetchEventInfos,
			formik.setFieldValue
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [formik.values.events]);

	return (
		<>
			<div className="modal-content active">
				<div className="modal-body">
					<div className="full-col">
						<Notifications context="not_corner" />

						{/* Table that shows conflicts with other events*/}
						{conflicts.length > 0 && (
							<div className="obj list-obj">
								<table className="main-tbl scheduling-conflict">
									<tr>
										<th>
											{t(
												"BULK_ACTIONS.EDIT_EVENTS.GENERAL.CONFLICT_FIRST_EVENT"
											)}
										</th>
										<th>
											{t(
												"BULK_ACTIONS.EDIT_EVENTS.GENERAL.CONFLICT_SECOND_EVENT"
											)}
										</th>
										<th>{t("EVENTS.EVENTS.TABLE.START")}</th>
										<th>{t("EVENTS.EVENTS.TABLE.END")}</th>
									</tr>
									{conflicts.map((conflict) =>
										conflict.conflicts.map((c, key) => (
											<tr key={key}>
												<td>{conflict.eventId}</td>
												<td>{c.title}</td>
												<td>{c.start}</td>
												<td>{c.end}</td>
											</tr>
										))
									)}
								</table>
							</div>
						)}

						<div className="obj header-description">
							<span>{t("BULK_ACTIONS.EDIT_EVENTS.EDIT.HEADER")}</span>
						</div>

						{/* Repeat table for each selected event */}
						{!loading && (
							<FieldArray name="editedEvents">
								{({ insert, remove, push }) => (
									<>
										{
											/*todo: in old UI this was grouped by weekday, which is also stated in the description in the div above
                                        now there isn't any grouping and there is one div per event -> find out, if that is okay and adapt again if necessary */
											formik.values.editedEvents.map((event, key) => (
												<div className="obj tbl-details">
													<header>{event.title}</header>
													<div className="obj-container">
														<table className="main-tbl">
															<tbody>
																{/* Repeat for all metadata rows*/}
																{hasAccess(
																	"ROLE_UI_EVENTS_DETAILS_METADATA_EDIT",
																	user
																) && (
																	<>
																		<tr>
																			<td>
																				<span>
																					{t(
																						"EVENTS.EVENTS.DETAILS.METADATA.TITLE"
																					)}
																				</span>
																			</td>
																			<td className="editable ng-isolated-scope">
																				{/*
																				 * Per event there are 14 input fields, so with 'key * 14', the right
																				 * event is reached. After the '+' comes the number of the input field.
																				 * This is the first input field for this event.
																				 */}
																				<Field
																					tabIndex={key * 14 + 1}
																					name={`editedEvents.${key}.changedTitle`}
																					metadataField={{
																						type: "text",
																					}}
																					component={RenderField}
																				/>
																			</td>
																		</tr>
																		<tr>
																			<td>
																				<span>
																					{t(
																						"EVENTS.EVENTS.DETAILS.METADATA.SERIES"
																					)}
																				</span>
																			</td>
																			<td className="editable ng-isolated-scope">
																				{/*
																				 * Per event there are 14 input fields, so with 'key * 14', the right
																				 * event is reached. After the '+' comes the number of the input field.
																				 * This is the second input field for this event.
																				 */}
																				<Field
																					tabIndex={key * 14 + 2}
																					name={`editedEvents.${key}.changedSeries`}
																					metadataField={{
																						type: "text",
																						collection: seriesOptions,
																						id: "isPartOf",
																						required:
																							formik.values.editedEvents[key]
																								.series !== "",
																					}}
																					component={RenderField}
																				/>
																			</td>
																		</tr>
																	</>
																)}
																{hasAccess(
																	"ROLE_UI_EVENTS_DETAILS_SCHEDULING_EDIT",
																	user
																) && (
																	<>
																		<tr>
																			<td>
																				{t(
																					"EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.TIMEZONE"
																				)}
																			</td>
																			<td>{"UTC" + getTimezoneOffset()}</td>
																		</tr>
																		<tr>
																			<td>
																				{t(
																					"EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.START_TIME"
																				)}
																			</td>
																			<td className="editable ng-isolated-scope">
																				{/* drop-down for hour
																				 *
																				 * Per event there are 14 input fields, so with 'key * 14', the right
																				 * event is reached. After the '+' comes the number of the input field.
																				 * This is the third input field for this event.
																				 */}
																				<DropDown
																					value={
																						formik.values.editedEvents[key]
																							.changedStartTimeHour
																					}
																					text={
																						formik.values.editedEvents[key]
																							.changedStartTimeHour
																					}
																					options={hours}
																					type={"time"}
																					required={true}
																					handleChange={(element) =>
																						formik.setFieldValue(
																							`editedEvents.${key}.changedStartTimeHour`,
																							element.value
																						)
																					}
																					placeholder={t(
																						"EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.HOUR"
																					)}
																					tabIndex={key * 14 + 3}
																				/>

																				{/* drop-down for minute
																				 *
																				 * Per event there are 14 input fields, so with 'key * 14', the right
																				 * event is reached. After the '+' comes the number of the input field.
																				 * This is the fourth input field for this event.
																				 */}
																				<DropDown
																					value={
																						formik.values.editedEvents[key]
																							.changedStartTimeMinutes
																					}
																					text={
																						formik.values.editedEvents[key]
																							.changedStartTimeMinutes
																					}
																					options={minutes}
																					type={"time"}
																					required={true}
																					handleChange={(element) =>
																						formik.setFieldValue(
																							`editedEvents.${key}.changedStartTimeMinutes`,
																							element.value
																						)
																					}
																					placeholder={t(
																						"EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.MINUTE"
																					)}
																					tabIndex={key * 14 + 4}
																				/>
																			</td>
																		</tr>
																		<tr>
																			<td>
																				{t(
																					"EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.END_TIME"
																				)}
																			</td>
																			<td className="editable ng-isolated-scope">
																				{/* drop-down for hour
																				 *
																				 * Per event there are 14 input fields, so with 'key * 14', the right
																				 * event is reached. After the '+' comes the number of the input field.
																				 * This is the fifth input field for this event.
																				 */}
																				<DropDown
																					value={
																						formik.values.editedEvents[key]
																							.changedEndTimeHour
																					}
																					text={
																						formik.values.editedEvents[key]
																							.changedEndTimeHour
																					}
																					options={hours}
																					type={"time"}
																					required={true}
																					handleChange={(element) =>
																						formik.setFieldValue(
																							`editedEvents.${key}.changedEndTimeHour`,
																							element.value
																						)
																					}
																					placeholder={t(
																						"EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.HOUR"
																					)}
																					tabIndex={key * 14 + 5}
																				/>

																				{/* drop-down for minute
																				 *
																				 * Per event there are 14 input fields, so with 'key * 14', the right
																				 * event is reached. After the '+' comes the number of the input field.
																				 * This is the sixth input field for this event.
																				 */}
																				<DropDown
																					value={
																						formik.values.editedEvents[key]
																							.changedEndTimeMinutes
																					}
																					text={
																						formik.values.editedEvents[key]
																							.changedEndTimeMinutes
																					}
																					options={minutes}
																					type={"time"}
																					required={true}
																					handleChange={(element) =>
																						formik.setFieldValue(
																							`editedEvents.${key}.changedEndTimeMinutes`,
																							element.value
																						)
																					}
																					placeholder={t(
																						"EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.MINUTE"
																					)}
																					tabIndex={key * 14 + 6}
																				/>
																			</td>
																		</tr>

																		{/* Dropdown for location/input device
																		 *
																		 * Per event there are 14 input fields, so with 'key * 14', the right
																		 * event is reached. After the '+' comes the number of the input field.
																		 * This is the seventh input field for this event.
																		 */}
																		<tr>
																			<td>
																				{t(
																					"EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.LOCATION"
																				)}
																			</td>
																			<td className="editable ng-isolated-scope">
																				<DropDown
																					value={
																						formik.values.editedEvents[key]
																							.changedLocation
																					}
																					text={
																						formik.values.editedEvents[key]
																							.changedLocation
																					}
																					options={inputDevices}
																					type={"captureAgent"}
																					required={true}
																					handleChange={(element) => {
																						formik.setFieldValue(
																							`editedEvents.${key}.changedLocation`,
																							element.value
																						);
																						formik.setFieldValue(
																							`editedEvents.${key}.changedDeviceInputs`,
																							[]
																						);
																					}}
																					placeholder={`-- ${t(
																						"SELECT_NO_OPTION_SELECTED"
																					)} --`}
																					tabIndex={key * 14 + 7}
																				/>
																			</td>
																		</tr>

																		{/* the following seven lines can be commented in, when the possibility of a selection of individual inputs is desired and the backend has been adapted to support it
                                                                    <tr>
                                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.INPUTS')}</td>
                                                                        <td>
                                                                            {/* Render checkbox for each input option of the selected input device*/
																		/*}
                                                                            {renderInputDeviceOptions(key)}
                                                                        </td>
                                                                    </tr>
                                                                    */}

																		{/* Radio buttons for weekdays
																		 *
																		 * Per event there are 14 input fields, so with 'key * 14', the right
																		 * event is reached. After the '+' comes the number of the input field.
																		 * These radio buttons are input fields 8 to 14 for this event.
																		 */}
																		<tr>
																			<td>
																				{t(
																					"EVENTS.EVENTS.NEW.SOURCE.SCHEDULE_MULTIPLE.WEEKDAY"
																				)}
																			</td>
																			<td className="weekdays">
																				{weekdays.map((day, index) => (
																					<label key={index}>
																						<Field
																							tabIndex={key * 14 + 8 + index}
																							type="radio"
																							name={`editedEvents.${key}.changedWeekday`}
																							value={day.name}
																						/>
																						{t(day.label)}
																					</label>
																				))}
																			</td>
																		</tr>
																	</>
																)}
															</tbody>
														</table>
													</div>
												</div>
											))
										}
									</>
								)}
							</FieldArray>
						)}
					</div>
				</div>
			</div>

			{/* Navigation buttons */}
			<footer>
				<button
					type="submit"
					className={cn("submit", {
						active: formik.dirty && formik.isValid,
						inactive: !(formik.dirty && formik.isValid),
					})}
					disabled={!(formik.dirty && formik.isValid)}
					onClick={async () => {
						removeNotificationWizardForm();
						if (
							await checkSchedulingConflicts(
								formik.values,
								setConflicts,
								checkForSchedulingConflicts,
								addNotification
							)
						) {
							nextPage(formik.values);
						}
					}}
					tabIndex="100"
				>
					{t("WIZARD.NEXT_STEP")}
				</button>

				<button
					className="cancel"
					onClick={() => {
						previousPage(formik.values, false);
						if (!formik.isValid) {
							// set page as not filled out
							setPageCompleted([]);
						}
					}}
					tabIndex="101"
				>
					{t("WIZARD.BACK")}
				</button>
			</footer>

			<div className="btm-spacer" />
		</>
	);
};

// Getting state data out of redux store
const mapStateToProps = (state) => ({
	user: getUserInformation(state),
	loading: isLoadingScheduling(state),
	seriesOptions: getSchedulingSeriesOptions(state),
});

// Mapping actions to dispatch
const mapDispatchToProps = (dispatch) => ({
	checkForSchedulingConflicts: (events) =>
		dispatch(checkForSchedulingConflicts(events)),
	addNotification: (type, key, duration, parameter, context) =>
		dispatch(addNotification(type, key, duration, parameter, context)),
	removeNotificationWizardForm: () => dispatch(removeNotificationWizardForm()),
	fetchSchedulingData: (events, fetchNewScheduling, setFieldValue) =>
		dispatch(fetchScheduling(events, fetchNewScheduling, setFieldValue)),
});

export default connect(
	mapStateToProps,
	mapDispatchToProps
)(EditScheduledEventsEditPage);
