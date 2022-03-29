import React, {useEffect, useState} from "react";
import {useTranslation} from "react-i18next";
import cn from "classnames";
import {connect} from "react-redux";
import {Field, FieldArray} from "formik";
import Notifications from "../../../shared/Notifications";
import RenderField from "../../../shared/wizard/RenderField";
import {getTimezoneOffset, hasAccess} from "../../../../utils/utils";
import {hours, minutes, NOTIFICATION_CONTEXT, weekdays} from "../../../../configs/modalConfig";
import {getRecordings} from "../../../../selectors/recordingSelectors";
import {fetchRecordings} from "../../../../thunks/recordingThunks";
import {checkForSchedulingConflicts, fetchScheduling} from "../../../../thunks/eventThunks";
import {fetchSeriesOptions} from "../../../../thunks/seriesThunks";
import {addNotification} from "../../../../thunks/notificationThunks";
import {removeNotificationWizardForm} from "../../../../actions/notificationActions";
import {getUserInformation} from "../../../../selectors/userInfoSelectors";

/**
 * This component renders the edit page for scheduled events of the corresponding bulk action
 */
const EditScheduledEventsEditPage = ({ previousPage, nextPage, formik, loadingInputDevices, inputDevices,
                                         checkForSchedulingConflicts, addNotification,
                                         removeNotificationWizardForm, user }) => {
    const { t } = useTranslation();

    // conflicts with other events
    const [conflicts, setConflicts] = useState([]);
    // loading flag
    const [loading, setLoading] = useState(false);
    // Options for series dropdown
    const [seriesOptions, setSeriesOptions] = useState([]);

    useEffect(() => {
        // Load recordings that can be used for input
        loadingInputDevices();

        // Fetch data about series and schedule info of chosen events from backend
        async function fetchData() {

            setLoading(true);
            const responseSeriesOptions = await fetchSeriesOptions();
            setSeriesOptions(responseSeriesOptions);

            // Only load schedule info about event, when not loaded before
            if (formik.values.editedEvents.length === 0) {
                let initialData = await fetchScheduling(formik.values.events);
                formik.setFieldValue('editedEvents', initialData);
            }

            setLoading(false);
        }

        fetchData().then();
    }, []);

    // Render input device options of currently chosen input device
    const renderInputDeviceOptions = key => {
        if (!!formik.values.changedLocation) {
            let inputDevice = inputDevices.find(({ Name }) => Name === formik.values.changedLocation);
            return (
                inputDevice.inputs.map((input, key) => (
                    <label key={key}>
                        <Field type="checkbox"
                               name={`editedEvents.${key}.changedDeviceInputs`}
                               value={input.id}
                               tabIndex="12"/>
                        {t(input.value)}
                    </label>
                ))
            )
        }
    };

    const checkConflicts = async () => {

        // Check if each start is before end
        for (let i = 0; i < formik.values.editedEvents.length; i++) {
            let event = formik.values.editedEvents[i];
            let startTime = new Date();
            startTime.setHours(event.changedStartTimeHour, event.changedStartTimeMinutes, 0, 0);
            let endTime = new Date();
            endTime.setHours(event.changedEndTimeHour, event.changedEndTimeMinutes, 0, 0);

            if (startTime > endTime) {
                addNotification('error', 'CONFLICT_END_BEFORE_START', -1, null, NOTIFICATION_CONTEXT);
                return false;
            }
        }

        // Use backend for check for conflicts with other events
        const response = await checkForSchedulingConflicts(formik.values.editedEvents);

        if (response.length > 0) {
            setConflicts(response);
            return false;
        } else {
            setConflicts([]);
            return true;
        }
    }

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
                                        <th>{t('BULK_ACTIONS.EDIT_EVENTS.GENERAL.CONFLICT_FIRST_EVENT')}</th>
                                        <th>{t('BULK_ACTIONS.EDIT_EVENTS.GENERAL.CONFLICT_SECOND_EVENT')}</th>
                                        <th>{t('EVENTS.EVENTS.TABLE.START')}</th>
                                        <th>{t('EVENTS.EVENTS.TABLE.END')}</th>
                                    </tr>
                                    {conflicts.map((conflict) => (
                                        conflict.conflicts.map((c, key) => (
                                            <tr key={key}>
                                                <td>{conflict.eventId}</td>
                                                <td>{c.title}</td>
                                                <td>{c.start}</td>
                                                <td>{c.end}</td>
                                            </tr>
                                        ))
                                    ))}
                                </table>
                            </div>
                        )}

                        <div className="obj header-description">
                            <span>{t('BULK_ACTIONS.EDIT_EVENTS.EDIT.HEADER')}</span>
                        </div>

                        {/* Repeat table for each selected event */}
                        {!loading && (
                            <FieldArray name="editedEvents">
                                {({ insert, remove, push }) => (
                                    <>
                                        {formik.values.editedEvents.map((event, key) => (
                                            <div className="obj tbl-details">
                                                <header>
                                                    {event.title}
                                                </header>
                                                <div className="obj-container">
                                                    <table className="main-tbl">
                                                        <tbody>
                                                            {/* Repeat for all metadata rows*/}
                                                            {hasAccess("ROLE_UI_EVENTS_DETAILS_METADATA_EDIT", user) && (
                                                                <>
                                                                    <tr>
                                                                        <td>
                                                                            <span>{t('EVENTS.EVENTS.DETAILS.METADATA.TITLE')}</span>
                                                                        </td>
                                                                        <td className="editable ng-isolated-scope">
                                                                            <Field name={`editedEvents.${key}.changedTitle`}
                                                                                   metadataField={{
                                                                                       type: 'text'
                                                                                   }}
                                                                                   component={RenderField}/>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>
                                                                            <span>{t('EVENTS.EVENTS.DETAILS.METADATA.SERIES')}</span>
                                                                        </td>
                                                                        <td className="editable ng-isolated-scope">
                                                                            <Field name={`editedEvents.${key}.changedSeries`}
                                                                                   metadataField={{
                                                                                       type: 'text',
                                                                                       collection: seriesOptions
                                                                                   }}
                                                                                   component={RenderField}/>
                                                                        </td>
                                                                    </tr>
                                                                </>
                                                            )}
                                                            {hasAccess("ROLE_UI_EVENTS_DETAILS_SCHEDULING_EDIT", user) && (
                                                                <>
                                                                    <tr>
                                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.TIMEZONE')}</td>
                                                                        <td>{'UTC' + getTimezoneOffset()}</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.START_TIME')}</td>
                                                                        <td>
                                                                            {/* One option for each entry in hours*/}
                                                                            <Field tabIndex="5"
                                                                                   as="select"
                                                                                   name={`editedEvents.${key}.changedStartTimeHour`}
                                                                                   placeholder={t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.HOUR')}>
                                                                                {hours.map((i, key) => (
                                                                                    <option key={key}
                                                                                            value={i.value}>
                                                                                        {i.value}
                                                                                    </option>
                                                                                ))}
                                                                            </Field>
                                                                            {/* One option for each entry in minutes*/}
                                                                            <Field tabIndex="5"
                                                                                   as="select"
                                                                                   name={`editedEvents.${key}.changedStartTimeMinutes`}
                                                                                   placeholder={t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.MINUTE')}>
                                                                                {minutes.map((i, key) => (
                                                                                    <option key={key}
                                                                                            value={i.value}>
                                                                                        {i.value}
                                                                                    </option>
                                                                                ))}
                                                                            </Field>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.DATE_TIME.END_TIME')}</td>
                                                                        <td>
                                                                            {/* One option for each entry in hours*/}
                                                                            <Field tabIndex="7"
                                                                                   as="select"
                                                                                   name={`editedEvents.${key}.changedEndTimeHour`}
                                                                                   placeholder={t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.HOUR')}>
                                                                                {hours.map((i, key) => (
                                                                                    <option key={key}
                                                                                            value={i.value}>
                                                                                        {i.value}
                                                                                    </option>
                                                                                ))}
                                                                            </Field>
                                                                            {/* One option for each entry in minutes*/}
                                                                            <Field tabIndex="8"
                                                                                   as="select"
                                                                                   name={`editedEvents.${key}.changedEndTimeMinutes`}
                                                                                   placeholder={t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.MINUTE')}>
                                                                                {minutes.map((i, key) => (
                                                                                    <option key={key}
                                                                                            value={i.value}>
                                                                                        {i.value}
                                                                                    </option>
                                                                                ))}
                                                                            </Field>
                                                                        </td>
                                                                    </tr>
                                                                    {/* Dropdown for location/input device */}
                                                                    <tr>
                                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.LOCATION')}</td>
                                                                        <td>
                                                                            <select tabIndex="11"
                                                                                    defaultValue="default"
                                                                                    onChange={e => {
                                                                                        formik.setFieldValue(`editedEvents.${key}.changedLocation`, e.target.value);
                                                                                        formik.setFieldValue(`editedEvents.${key}.changedDeviceInputs`, []);
                                                                                    }}>
                                                                                <option
                                                                                    value="default">{formik.values.editedEvents[key].changedLocation}</option>
                                                                                {inputDevices.map((inputDevices, key) => (
                                                                                    <option key={key}
                                                                                            value={inputDevices.Name}>{inputDevices.Name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td>{t('EVENTS.EVENTS.DETAILS.SOURCE.PLACEHOLDER.INPUTS')}</td>
                                                                        <td>
                                                                            {/* Render checkbox for each input option of the selected input device*/}
                                                                            {renderInputDeviceOptions(key)}
                                                                        </td>
                                                                    </tr>
                                                                    {/* Radio buttons for weekdays */}
                                                                    <tr>
                                                                        <td>{t('EVENTS.EVENTS.NEW.SOURCE.SCHEDULE_MULTIPLE.WEEKDAY')}</td>
                                                                        <td className="weekdays">
                                                                            {weekdays.map((day, index) => (
                                                                                <label key={index}>
                                                                                    <Field type="radio"
                                                                                           name={`editedEvents.${key}.changedWeekday`}
                                                                                           value={day.name}/>
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
                                        ))}
                                    </>
                                )}
                            </FieldArray>
                        )}
                    </div>
                </div>
            </div>

            {/* Navigation buttons */}
            <footer>
                <button type="submit"
                        className={cn("submit", {
                            active: (formik.dirty && formik.isValid),
                            inactive: !(formik.dirty && formik.isValid)
                        })}
                        disabled={!(formik.dirty && formik.isValid)}
                        onClick={async () => {
                            removeNotificationWizardForm();
                            if (await checkConflicts()) {
                                nextPage(formik.values);
                            }
                        }}
                        tabIndex="100">{t('WIZARD.NEXT_STEP')}</button>

                <button className="cancel"
                        onClick={() => previousPage(formik.values, false)}
                        tabIndex="101">{t('WIZARD.BACK')}</button>
            </footer>

            <div className="btm-spacer"/>
        </>
    );
};

// Getting state data out of redux store
const mapStateToProps = state => ({
    inputDevices: getRecordings(state),
    user: getUserInformation(state)
});

// Mapping actions to dispatch
const mapDispatchToProps = dispatch => ({
    loadingInputDevices: () => dispatch(fetchRecordings("inputs")),
    checkForSchedulingConflicts: events => dispatch(checkForSchedulingConflicts(events)),
    addNotification: (type, key, duration, parameter, context) => dispatch(addNotification(type, key, duration, parameter, context)),
    removeNotificationWizardForm: () => dispatch(removeNotificationWizardForm())
})

export default connect(mapStateToProps, mapDispatchToProps)(EditScheduledEventsEditPage);
